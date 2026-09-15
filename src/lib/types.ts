export type Candidate = {
  id: string;
  paperId: string;
  title: string;
  year?: number;
  authors: string;
  citationCount?: number;
  abstract?: string;
  arxivId?: string;
  doi?: string;
  url?: string;
  pool: "reference" | "citation" | "recommendation" | "related";
  influential?: boolean;
};

export type Neighbor = {
  id: string;
  title: string;
  year?: number;
  authors: string;
  why: string;
  citationCount?: number;
  url?: string;
  arxivId?: string;
};

export type Brief = {
  id: string;
  title: string;
  year?: number;
  authors: string[];
  venue?: string;
  citationCount?: number;
  abstract?: string;
  arxivId?: string;
  doi?: string;
  pdfUrl?: string;
  claim: string;
  how: string[];
  whatsNew: string;
  ignoreIf: string;
  prerequisites: string[];
  builtOn: Neighbor[];
  similar: Neighbor[];
  then: Neighbor[];
  generatedAt: string;
  usedLlm: boolean;
};
