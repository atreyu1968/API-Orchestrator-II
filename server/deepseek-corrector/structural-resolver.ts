import OpenAI from 'openai';
import { db } from '../db';
import { correctedManuscripts } from '@shared/schema';
import { eq } from 'drizzle-orm';
import type { CorrectionRecord, AuditIssue } from '@shared/schema';

const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY
});

export interface StructuralIssue {
  id: string;
  type: 'duplicate_chapters' | 'duplicate_scenes' | 'redundant_content';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  affectedChapters: number[];
  affectedContent: string[];
  resolutionOptions: ResolutionOption[];
}

export interface ResolutionOption {
  id: string;
  type: 'delete' | 'rewrite' | 'merge';
  label: string;
  description: string;
  chaptersToDelete?: number[];
  chapterToKeep?: number;
  chaptersToMerge?: number[];
  estimatedTokens?: number;
}

export interface StructuralResolutionProgress {
  phase: 'detecting' | 'resolving' | 'rewriting' | 'completed' | 'error';
  message: string;
  current?: number;
  total?: number;
}

export function detectStructuralIssues(
  auditIssues: AuditIssue[],
  manuscriptContent: string
): StructuralIssue[] {
  const structuralIssues: StructuralIssue[] = [];
  
  for (const issue of auditIssues) {
    if (isStructuralIssue(issue)) {
      const chapters = extractAffectedChapters(issue.location, issue.description);
      
      if (chapters.length > 1) {
        const structuralIssue: StructuralIssue = {
          id: `structural-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: detectStructuralType(issue.description),
          severity: issue.severity,
          description: issue.description,
          affectedChapters: chapters,
          affectedContent: extractAffectedContent(manuscriptContent, chapters),
          resolutionOptions: generateResolutionOptions(chapters, issue.description)
        };
        
        structuralIssues.push(structuralIssue);
      }
    }
  }
  
  return structuralIssues;
}

function isStructuralIssue(issue: AuditIssue): boolean {
  const structuralPatterns = [
    /capítulos?\s+(son\s+)?idénticos/i,
    /repetición\s+literal/i,
    /mismo[s]?\s+evento[s]?/i,
    /contenido\s+duplicado/i,
    /escenas?\s+duplicada/i,
    /capítulos?\s+duplicados/i,
    /exactamente\s+los\s+mismos/i,
    /narran\s+lo\s+mismo/i,
    /repiten?\s+(el|los)\s+mismo/i
  ];
  
  const descriptionLower = issue.description.toLowerCase();
  return structuralPatterns.some(pattern => pattern.test(issue.description)) ||
    (descriptionLower.includes('capítulo') && 
     (descriptionLower.includes('idéntic') || descriptionLower.includes('duplic')));
}

function detectStructuralType(description: string): 'duplicate_chapters' | 'duplicate_scenes' | 'redundant_content' {
  const descLower = description.toLowerCase();
  
  if (descLower.includes('capítulo') && (descLower.includes('idéntic') || descLower.includes('duplicad'))) {
    return 'duplicate_chapters';
  }
  
  if (descLower.includes('escena') && (descLower.includes('duplicad') || descLower.includes('repet'))) {
    return 'duplicate_scenes';
  }
  
  return 'redundant_content';
}

function extractAffectedChapters(location: string, description: string): number[] {
  const chapters: number[] = [];
  const fullText = `${location} ${description}`;
  
  const capituloPattern = /Capítulo\s*(\d+)/gi;
  let match;
  while ((match = capituloPattern.exec(fullText)) !== null) {
    const num = parseInt(match[1]);
    if (!chapters.includes(num) && num > 0 && num < 200) {
      chapters.push(num);
    }
  }
  
  const rangePattern = /capítulos?\s*(\d+)\s*(?:,\s*(\d+)\s*)?(?:y|,)\s*(?:capítulo\s*)?(\d+)/gi;
  while ((match = rangePattern.exec(fullText)) !== null) {
    for (let i = 1; i <= 3; i++) {
      if (match[i]) {
        const num = parseInt(match[i]);
        if (!chapters.includes(num) && num > 0 && num < 200) {
          chapters.push(num);
        }
      }
    }
  }
  
  const numberListPattern = /(\d+)\s*,\s*(\d+)\s*y\s*(\d+)/g;
  while ((match = numberListPattern.exec(fullText)) !== null) {
    for (let i = 1; i <= 3; i++) {
      if (match[i]) {
        const num = parseInt(match[i]);
        if (!chapters.includes(num) && num > 0 && num < 200) {
          chapters.push(num);
        }
      }
    }
  }
  
  const twoNumberPattern = /(\d+)\s*y\s*(\d+)/g;
  while ((match = twoNumberPattern.exec(fullText)) !== null) {
    for (let i = 1; i <= 2; i++) {
      if (match[i]) {
        const num = parseInt(match[i]);
        if (!chapters.includes(num) && num > 0 && num < 200) {
          chapters.push(num);
        }
      }
    }
  }
  
  if (location) {
    const locationPattern = /(\d+)/g;
    const locationParts = location.split(/[,y]/i);
    for (const part of locationParts) {
      const numMatch = part.match(locationPattern);
      if (numMatch) {
        for (const n of numMatch) {
          const num = parseInt(n);
          if (!chapters.includes(num) && num > 0 && num < 200) {
            chapters.push(num);
          }
        }
      }
    }
  }
  
  return chapters.sort((a, b) => a - b);
}

function extractAffectedContent(manuscriptContent: string, chapters: number[]): string[] {
  const content: string[] = [];
  
  for (const chapterNum of chapters) {
    const chapterPattern = new RegExp(
      `(Capítulo\\s*${chapterNum}[^\\n]*\\n)([\\s\\S]*?)(?=Capítulo\\s*\\d+|$)`,
      'i'
    );
    const match = manuscriptContent.match(chapterPattern);
    if (match) {
      content.push(match[0].trim());
    }
  }
  
  return content;
}

function generateResolutionOptions(chapters: number[], description: string): ResolutionOption[] {
  const options: ResolutionOption[] = [];
  
  options.push({
    id: `delete-keep-first`,
    type: 'delete',
    label: `Eliminar duplicados (mantener Capítulo ${chapters[0]})`,
    description: `Mantiene el Capítulo ${chapters[0]} y elimina los capítulos ${chapters.slice(1).join(', ')}`,
    chapterToKeep: chapters[0],
    chaptersToDelete: chapters.slice(1)
  });
  
  if (chapters.length > 1) {
    options.push({
      id: `delete-keep-last`,
      type: 'delete',
      label: `Eliminar duplicados (mantener Capítulo ${chapters[chapters.length - 1]})`,
      description: `Mantiene el Capítulo ${chapters[chapters.length - 1]} y elimina los capítulos ${chapters.slice(0, -1).join(', ')}`,
      chapterToKeep: chapters[chapters.length - 1],
      chaptersToDelete: chapters.slice(0, -1)
    });
  }
  
  for (const chapter of chapters.slice(1)) {
    options.push({
      id: `rewrite-${chapter}`,
      type: 'rewrite',
      label: `Reescribir Capítulo ${chapter}`,
      description: `Genera contenido completamente nuevo para el Capítulo ${chapter}, diferente al Capítulo ${chapters[0]}`,
      chaptersToMerge: [chapter],
      estimatedTokens: 3000
    });
  }
  
  if (chapters.length === 2) {
    options.push({
      id: `merge-${chapters.join('-')}`,
      type: 'merge',
      label: `Fusionar Capítulos ${chapters.join(' y ')}`,
      description: `Combina los mejores elementos de ambos capítulos en uno solo`,
      chaptersToMerge: chapters,
      estimatedTokens: 4000
    });
  }
  
  return options;
}

export async function applyStructuralResolution(
  manuscriptId: number,
  issueId: string,
  optionId: string,
  onProgress?: (progress: StructuralResolutionProgress) => void
): Promise<{ success: boolean; error?: string }> {
  try {
    const [manuscript] = await db.select()
      .from(correctedManuscripts)
      .where(eq(correctedManuscripts.id, manuscriptId));
    
    if (!manuscript) {
      return { success: false, error: 'Manuscrito no encontrado' };
    }
    
    const pendingCorrections = (manuscript.pendingCorrections as CorrectionRecord[]) || [];
    const structuralCorrection = pendingCorrections.find(c => c.id === issueId);
    
    if (!structuralCorrection) {
      return { success: false, error: 'Issue estructural no encontrado' };
    }
    
    const structuralIssue = getStructuralIssueFromCorrection(structuralCorrection);
    if (!structuralIssue) {
      return { success: false, error: 'No es un problema estructural válido' };
    }
    
    const option = structuralIssue.resolutionOptions.find(o => o.id === optionId);
    if (!option) {
      return { success: false, error: `Opción de resolución '${optionId}' no válida. Opciones disponibles: ${structuralIssue.resolutionOptions.map(o => o.id).join(', ')}` };
    }
    
    let content = manuscript.correctedContent || manuscript.originalContent;
    
    onProgress?.({
      phase: 'resolving',
      message: `Aplicando resolución: ${option.type}...`
    });
    
    switch (option.type) {
      case 'delete':
        content = await applyDeleteResolution(content, option, onProgress);
        break;
      case 'rewrite':
        content = await applyRewriteResolution(content, option, structuralCorrection.instruction, onProgress);
        break;
      case 'merge':
        content = await applyMergeResolution(content, option, onProgress);
        break;
    }
    
    const updatedCorrections = pendingCorrections.map(c => {
      if (c.id === issueId) {
        return {
          ...c,
          status: 'applied' as const,
          correctedText: `[RESOLUCIÓN ESTRUCTURAL] ${option.type}: ${option.description}`,
          reviewedAt: new Date().toISOString()
        };
      }
      return c;
    });
    
    await db.update(correctedManuscripts)
      .set({
        correctedContent: content,
        pendingCorrections: updatedCorrections,
        approvedIssues: (manuscript.approvedIssues || 0) + 1
      })
      .where(eq(correctedManuscripts.id, manuscriptId));
    
    onProgress?.({
      phase: 'completed',
      message: 'Resolución estructural aplicada exitosamente'
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error aplicando resolución estructural:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
  }
}

async function applyDeleteResolution(
  content: string,
  option: ResolutionOption,
  onProgress?: (progress: StructuralResolutionProgress) => void
): Promise<string> {
  let updatedContent = content;
  const chaptersToDelete = option.chaptersToDelete || [];
  
  for (let i = 0; i < chaptersToDelete.length; i++) {
    const chapterNum = chaptersToDelete[i];
    
    onProgress?.({
      phase: 'resolving',
      message: `Eliminando Capítulo ${chapterNum}...`,
      current: i + 1,
      total: chaptersToDelete.length
    });
    
    const chapterPattern = new RegExp(
      `(Capítulo\\s*${chapterNum}[^\\n]*\\n)([\\s\\S]*?)(?=Capítulo\\s*\\d+|$)`,
      'i'
    );
    
    updatedContent = updatedContent.replace(chapterPattern, '');
  }
  
  updatedContent = renumberChapters(updatedContent);
  
  return updatedContent;
}

async function applyRewriteResolution(
  content: string,
  option: ResolutionOption,
  issueDescription: string,
  onProgress?: (progress: StructuralResolutionProgress) => void
): Promise<string> {
  const chapterToRewrite = option.chaptersToMerge?.[0];
  if (!chapterToRewrite) return content;
  
  onProgress?.({
    phase: 'rewriting',
    message: `Generando nuevo contenido para Capítulo ${chapterToRewrite}...`
  });
  
  const chapterPattern = new RegExp(
    `(Capítulo\\s*${chapterToRewrite}[^\\n]*\\n)([\\s\\S]*?)(?=Capítulo\\s*\\d+|$)`,
    'i'
  );
  
  const match = content.match(chapterPattern);
  if (!match) return content;
  
  const chapterHeader = match[1];
  const originalChapterContent = match[2];
  
  const prevChapter = extractChapterContent(content, chapterToRewrite - 1);
  const nextChapter = extractChapterContent(content, chapterToRewrite + 1);
  
  const prompt = `Eres un novelista experto. El siguiente capítulo tiene contenido duplicado con otros capítulos y debe ser COMPLETAMENTE REESCRITO con eventos DIFERENTES.

PROBLEMA: ${issueDescription}

CAPÍTULO ANTERIOR (para continuidad):
${prevChapter ? prevChapter.substring(0, 2000) : 'Es el primer capítulo.'}

CAPÍTULO A REESCRIBIR:
${originalChapterContent}

CAPÍTULO SIGUIENTE (para continuidad):
${nextChapter ? nextChapter.substring(0, 2000) : 'Es el último capítulo.'}

INSTRUCCIONES:
1. Genera contenido COMPLETAMENTE NUEVO y DIFERENTE
2. Mantén los mismos personajes pero con eventos distintos
3. Asegura continuidad con el capítulo anterior y siguiente
4. Mantén el estilo y tono del autor original
5. Longitud similar al original (${originalChapterContent.split(/\s+/).length} palabras aprox.)

Devuelve SOLO el contenido del capítulo reescrito, sin el encabezado "Capítulo X":`;

  try {
    const response = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'Eres un novelista profesional que reescribe capítulos manteniendo el estilo del autor.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 4000
    });
    
    const newContent = response.choices[0]?.message?.content?.trim() || originalChapterContent;
    
    return content.replace(chapterPattern, `${chapterHeader}${newContent}\n\n`);
  } catch (error) {
    console.error('Error reescribiendo capítulo:', error);
    return content;
  }
}

async function applyMergeResolution(
  content: string,
  option: ResolutionOption,
  onProgress?: (progress: StructuralResolutionProgress) => void
): Promise<string> {
  const chaptersToMerge = option.chaptersToMerge || [];
  if (chaptersToMerge.length < 2) return content;
  
  onProgress?.({
    phase: 'resolving',
    message: `Fusionando Capítulos ${chaptersToMerge.join(' y ')}...`
  });
  
  const chapterContents: string[] = [];
  for (const num of chaptersToMerge) {
    const chapterContent = extractChapterContent(content, num);
    if (chapterContent) {
      chapterContents.push(chapterContent);
    }
  }
  
  if (chapterContents.length < 2) return content;
  
  const prompt = `Eres un editor literario experto. Debes FUSIONAR los siguientes capítulos duplicados en UNO SOLO, conservando los mejores elementos de cada uno.

CAPÍTULO ${chaptersToMerge[0]}:
${chapterContents[0]}

CAPÍTULO ${chaptersToMerge[1]}:
${chapterContents[1]}

INSTRUCCIONES:
1. Combina los mejores elementos narrativos de ambos capítulos
2. Elimina redundancias y repeticiones
3. Mantén coherencia narrativa
4. El resultado debe ser UN SOLO capítulo cohesivo
5. Mantén el estilo y tono originales

Devuelve SOLO el contenido fusionado del capítulo, sin encabezados:`;

  try {
    const response = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'Eres un editor literario que fusiona capítulos duplicados.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.6,
      max_tokens: 5000
    });
    
    const mergedContent = response.choices[0]?.message?.content?.trim();
    
    if (mergedContent) {
      let updatedContent = content;
      const firstChapter = chaptersToMerge[0];
      
      const firstChapterPattern = new RegExp(
        `(Capítulo\\s*${firstChapter}[^\\n]*\\n)([\\s\\S]*?)(?=Capítulo\\s*\\d+|$)`,
        'i'
      );
      const firstMatch = updatedContent.match(firstChapterPattern);
      if (firstMatch) {
        updatedContent = updatedContent.replace(firstChapterPattern, `${firstMatch[1]}${mergedContent}\n\n`);
      }
      
      for (const chapterNum of chaptersToMerge.slice(1)) {
        const chapterPattern = new RegExp(
          `(Capítulo\\s*${chapterNum}[^\\n]*\\n)([\\s\\S]*?)(?=Capítulo\\s*\\d+|$)`,
          'i'
        );
        updatedContent = updatedContent.replace(chapterPattern, '');
      }
      
      updatedContent = renumberChapters(updatedContent);
      
      return updatedContent;
    }
  } catch (error) {
    console.error('Error fusionando capítulos:', error);
  }
  
  return content;
}

function extractChapterContent(content: string, chapterNum: number): string | null {
  const chapterPattern = new RegExp(
    `Capítulo\\s*${chapterNum}[^\\n]*\\n([\\s\\S]*?)(?=Capítulo\\s*\\d+|$)`,
    'i'
  );
  const match = content.match(chapterPattern);
  return match ? match[1].trim() : null;
}

function renumberChapters(content: string): string {
  let currentNumber = 1;
  
  return content.replace(
    /Capítulo\s*\d+/gi,
    () => `Capítulo ${currentNumber++}`
  );
}

export function getStructuralIssueFromCorrection(correction: CorrectionRecord): StructuralIssue | null {
  if (!isStructuralIssueDescription(correction.instruction)) {
    return null;
  }
  
  const chapters = extractAffectedChapters(correction.location, correction.instruction);
  
  if (chapters.length <= 1) {
    console.log(`[StructuralResolver] No se pudieron extraer capítulos de: location="${correction.location}", instruction="${correction.instruction.substring(0, 100)}..."`);
    return null;
  }
  
  console.log(`[StructuralResolver] Capítulos afectados detectados: ${chapters.join(', ')}`);
  
  return {
    id: correction.id,
    type: detectStructuralType(correction.instruction),
    severity: correction.severity,
    description: correction.instruction,
    affectedChapters: chapters,
    affectedContent: [],
    resolutionOptions: generateResolutionOptions(chapters, correction.instruction)
  };
}

function isStructuralIssueDescription(description: string): boolean {
  const structuralPatterns = [
    /capítulos?\s+(son\s+)?idénticos/i,
    /repetición\s+literal/i,
    /mismo[s]?\s+evento[s]?/i,
    /contenido\s+duplicado/i,
    /escenas?\s+duplicada/i,
    /capítulos?\s+duplicados/i,
    /exactamente\s+los\s+mismos/i
  ];
  
  return structuralPatterns.some(pattern => pattern.test(description));
}
