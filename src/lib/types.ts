export type Topic = "html" | "css" | "javascript" | "jsp" | "servlets" | "examen";

export type ExerciseType =
  | "build"
  | "visual-match"
  | "written-answer"
  | "table-answer";

export type CodeFiles = {
  html: string;
  css: string;
  javascript: string;
};

export type ValidationField = keyof CodeFiles;

export type EditorLanguage = ValidationField | "java" | "plain";

export type ExerciseAsset = {
  src: string;
  title?: string;
  alt?: string;
};

export type ExerciseEditorConfig = {
  labels?: Partial<Record<ValidationField, string>>;
  languages?: Partial<Record<ValidationField, EditorLanguage>>;
  initialFile?: ValidationField;
};

export type ExercisePreviewConfig = {
  htmlField?: ValidationField;
  cssFields?: ValidationField[];
  javascriptFields?: ValidationField[];
};

export type TableQuestion = {
  columns: string[];
  rows: string[];
  options?: string[];
};

export type TableAnswerRule = {
  type: "tableAnswer";
  answers: Record<string, Record<string, string>>;
  message: string;
  caseSensitive?: boolean;
};

export type ValidationRule =
  | {
      type: "contains";
      field: ValidationField;
      value: string;
      message: string;
      caseSensitive?: boolean;
    }
  | {
      type: "notContains";
      field: ValidationField;
      value: string;
      message: string;
      caseSensitive?: boolean;
    }
  | {
      type: "regex";
      field: ValidationField;
      pattern: string;
      flags?: string;
      message: string;
    }
  | {
      type: "domSelector";
      selector: string;
      minCount?: number;
      message: string;
    }
  | {
      type: "consoleIncludes";
      value: string;
      message: string;
      caseSensitive?: boolean;
    }
  | {
      type: "keywords";
      field: ValidationField;
      values: string[];
      minMatches?: number;
      message: string;
      caseSensitive?: boolean;
    }
  | TableAnswerRule;

export type ExerciseValidation = {
  mode: "all";
  successMessage: string;
  rules: ValidationRule[];
};

export type Exercise = {
  id: string;
  topic: Topic;
  type: ExerciseType;
  title: string;
  difficulty: "base" | "media" | "reto";
  estimatedMinutes: number;
  publishedAt?: string;
  prompt: string;
  notes?: string[];
  assets?: ExerciseAsset[];
  editor?: ExerciseEditorConfig;
  preview?: ExercisePreviewConfig;
  tableQuestion?: TableQuestion;
  starterCode: CodeFiles;
  targetCode?: CodeFiles;
  validation: ExerciseValidation;
};

export type ExerciseManifest = {
  files: string[];
};

export type ValidationResult = {
  passed: boolean;
  message: string;
  rule: ValidationRule;
};

export type ExerciseProgress = {
  completed: boolean;
  lastEditedAt: string;
  attempts: number;
};
