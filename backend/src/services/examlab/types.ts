export type QuizLikeItem = {
  id: number;
  question: string;
  options: string[];
  correct: number;
  hint: string;
  explanation: string;
};

export type GenSpecMCQ = {
  type: "mcq";
  count: number;
  difficulty?: string;
  style?: string;
  topic?: string;
  prompt: string;
  points?: number;
};

export type GenSpecShort = {
  type: "short";
  count: number;
  difficulty?: string;
  style?: string;
  topic?: string;
  prompt: string;
  points?: number;
};

export type GenSpec = GenSpecMCQ | GenSpecShort;

export type ExamSectionSpec = {
  id: string;
  title: string;
  durationSec: number;
  instructions?: string;
  gen: GenSpec;
};

export type ExamSpec = {
  id: string;
  name: string;
  scoring: "right-only" | "ij" | "curve-table";
  curveTableId?: string;
  sections: ExamSectionSpec[];
  rubrics?: any[];
};

export type ExamPayload = {
  examId: string;
  name: string;
  sections: Array<{
    id: string;
    title: string;
    durationSec: number;
    items: QuizLikeItem[];
  }>;
};
