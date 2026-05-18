import {
  AlertCircle,
  BookMarked,
  BookOpen,
  CheckCircle2,
  Database,
  Eye,
  FileText,
  Github,
  Lightbulb,
  ListChecks,
  Palette,
  PanelLeftOpen,
  Play,
  ShieldQuestion,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import CodeEditor from "@/components/CodeEditor";
import ExerciseList from "@/components/ExerciseList";
import GiveUpDialog from "@/components/GiveUpDialog";
import PreviewFrame from "@/components/PreviewFrame";
import TableAnswer from "@/components/TableAnswer";
import ValidationPanel from "@/components/ValidationPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  codeThemeOptions,
  defaultCodeThemeId,
  isCodeThemeId,
  type CodeThemeId,
} from "@/lib/codeThemes";
import {
  loadCustomExercises,
  parseExerciseDocuments,
  saveCustomExercises,
} from "@/lib/customExerciseStore";
import { isNewExercise } from "@/lib/exerciseFreshness";
import { loadExercises } from "@/lib/exerciseLoader";
import {
  loadProgress,
  loadSavedCode,
  saveCode,
  saveProgress,
} from "@/lib/storage";
import { cn } from "@/lib/utils";
import { validateExercise } from "@/lib/validation";
import type {
  CodeFiles,
  EditorLanguage,
  Exercise,
  ExercisePreviewConfig,
  ExerciseProgress,
  Topic,
  ValidationField,
  ValidationResult,
} from "@/lib/types";

const emptyFiles: CodeFiles = {
  html: "",
  css: "",
  javascript: "",
};

const codeThemeStorageKey = "daw-lab:code-theme";
const hardModeStorageKey = "daw-lab:hard-mode";
const vimModeStorageKey = "daw-lab:vim-mode";
const autocompleteDisabledStorageKey = "daw-lab:autocomplete-disabled";
const previewLayoutStorageKey = "daw-lab:preview-layout";
const appThemeStorageKey = "daw-lab:app-theme";
const sidebarHiddenStorageKey = "daw-lab:sidebar-hidden";
const freshnessTickIntervalMs = 60 * 1000;
const repositoryUrl = "https://github.com/chevilan/estudiar-daw";

const topicLabels: Record<Topic, string> = {
  html: "HTML",
  css: "CSS",
  javascript: "JavaScript",
  jsp: "JSP",
  servlets: "Servlets",
  examen: "Examen",
};

const fileLabels: Record<ValidationField, string> = {
  html: "HTML",
  css: "CSS",
  javascript: "JS",
};

const topicFileLabels: Partial<Record<Topic, Record<ValidationField, string>>> = {
  jsp: {
    html: "JSP",
    css: "CSS / fragmento",
    javascript: "Servlet / Bean",
  },
  servlets: {
    html: "JSP",
    css: "web.xml",
    javascript: "Servlet.java",
  },
};

const topicFileLanguages: Partial<Record<Topic, Record<ValidationField, EditorLanguage>>> = {
  jsp: {
    html: "html",
    css: "plain",
    javascript: "java",
  },
  servlets: {
    html: "html",
    css: "html",
    javascript: "java",
  },
};

function getFileLabel(topic: Topic, field: ValidationField) {
  return topicFileLabels[topic]?.[field] ?? fileLabels[field];
}

function getFileLanguage(topic: Topic, field: ValidationField) {
  return topicFileLanguages[topic]?.[field] ?? field;
}

function getExerciseFileLabels(exercise: Exercise) {
  return {
    ...topicFileLabels[exercise.topic],
    ...exercise.editor?.labels,
  };
}

function getExerciseFileLanguages(exercise: Exercise) {
  return {
    ...topicFileLanguages[exercise.topic],
    ...exercise.editor?.languages,
  };
}

function getInitialActiveFile(exercise: Exercise): ValidationField {
  return exercise.editor?.initialFile ?? (exercise.topic === "servlets" ? "javascript" : "html");
}

function isServerSideTopic(topic: Topic) {
  return topic === "jsp" || topic === "servlets";
}

function isPreviewType(exercise: Exercise) {
  return exercise.type === "build" || exercise.type === "visual-match";
}

function getExerciseTypeLabel(type: Exercise["type"]) {
  if (type === "visual-match") {
    return "Clonar objetivo";
  }

  if (type === "written-answer") {
    return "Respuesta escrita";
  }

  if (type === "table-answer") {
    return "Tabla";
  }

  return "Construir";
}

function assetSource(src: string) {
  if (/^(?:https?:)?\/\//.test(src) || src.startsWith("/")) {
    return src;
  }

  return `${import.meta.env.BASE_URL}${src}`;
}

function createExercisePreviewFiles(
  sourceFiles: CodeFiles,
  previewConfig?: ExercisePreviewConfig,
): CodeFiles {
  const htmlField = previewConfig?.htmlField ?? "html";
  const cssFields = previewConfig?.cssFields ?? ["css"];
  const javascriptFields = previewConfig?.javascriptFields ?? ["javascript"];

  return {
    html: sourceFiles[htmlField],
    css: cssFields.map((field) => sourceFiles[field]).join("\n\n"),
    javascript: javascriptFields.map((field) => sourceFiles[field]).join("\n\n"),
  };
}

type PreviewLayout = "right" | "left" | "below";
type AppTheme = "classic" | CodeThemeId;

function createPendingResults(exercise: Exercise): ValidationResult[] {
  return exercise.validation.rules.map((rule) => ({
    passed: false,
    message: rule.message,
    rule,
  }));
}

function loadCodeTheme(): CodeThemeId {
  const savedTheme = localStorage.getItem(codeThemeStorageKey);
  return savedTheme && isCodeThemeId(savedTheme)
    ? savedTheme
    : defaultCodeThemeId;
}

function loadHardMode(): boolean {
  return localStorage.getItem(hardModeStorageKey) !== "off";
}

function loadVimMode(): boolean {
  return localStorage.getItem(vimModeStorageKey) === "on";
}

function loadAutocompleteDisabled(): boolean {
  return localStorage.getItem(autocompleteDisabledStorageKey) === "on";
}

function isPreviewLayout(value: string): value is PreviewLayout {
  return value === "right" || value === "left" || value === "below";
}

function loadPreviewLayout(): PreviewLayout {
  const saved = localStorage.getItem(previewLayoutStorageKey);
  return saved && isPreviewLayout(saved) ? saved : "right";
}

function isAppTheme(value: string): value is AppTheme {
  return value === "classic" || isCodeThemeId(value);
}

function loadAppTheme(): AppTheme {
  const saved = localStorage.getItem(appThemeStorageKey);
  return saved && isAppTheme(saved) ? saved : "classic";
}

function loadSidebarHidden(): boolean {
  return localStorage.getItem(sidebarHiddenStorageKey) === "on";
}

function renderInlineMarkdown(text: string) {
  return text.split(/(`[^`]+`)/g).map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={`${part}-${index}`}
          className="rounded border bg-secondary px-1 py-0.5 font-mono text-[0.82em] text-foreground"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return part;
  });
}

function renderGlossaryMarkdown(markdown: string) {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      if (line.startsWith("# ")) {
        return (
          <h2
            key={`${line}-${index}`}
            className="m-0 text-lg font-semibold tracking-tight"
          >
            {line.slice(2)}
          </h2>
        );
      }

      if (line.startsWith("## ")) {
        return (
          <h3
            key={`${line}-${index}`}
            className="m-0 border-t pt-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground first:border-t-0 first:pt-0"
          >
            {line.slice(3)}
          </h3>
        );
      }

      return (
        <p key={`${line}-${index}`} className="m-0 leading-relaxed">
          {renderInlineMarkdown(line)}
        </p>
      );
    });
}

export default function App() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [bundledExerciseIds, setBundledExerciseIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [customExerciseIds, setCustomExerciseIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [topic, setTopic] = useState<Topic | "todos">("todos");
  const [files, setFiles] = useState<CodeFiles>(emptyFiles);
  const [activeFile, setActiveFile] = useState<ValidationField>("html");
  const [consoleLines, setConsoleLines] = useState<string[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [hasRunValidation, setHasRunValidation] = useState(false);
  const [progressById, setProgressById] = useState<Record<string, ExerciseProgress>>({});
  const [previewNonce, setPreviewNonce] = useState(0);
  const [showGiveUpDialog, setShowGiveUpDialog] = useState(false);
  const [codeThemeId, setCodeThemeId] = useState<CodeThemeId>(loadCodeTheme);
  const [hardMode, setHardMode] = useState(loadHardMode);
  const [vimMode, setVimMode] = useState(loadVimMode);
  const [autocompleteDisabled, setAutocompleteDisabled] = useState(
    loadAutocompleteDisabled,
  );
  const [previewLayout, setPreviewLayout] = useState<PreviewLayout>(loadPreviewLayout);
  const [appTheme, setAppTheme] = useState<AppTheme>(loadAppTheme);
  const [showGlossary, setShowGlossary] = useState(false);
  const [glossaryMarkdown, setGlossaryMarkdown] = useState("");
  const [glossaryError, setGlossaryError] = useState<string | null>(null);
  const [sidebarHidden, setSidebarHidden] = useState(loadSidebarHidden);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, freshnessTickIntervalMs);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let isMounted = true;

    Promise.all([loadExercises(), loadCustomExercises()])
      .then(([loadedExercises, customExercises]) => {
        if (!isMounted) {
          return;
        }

        const allExercises = [...customExercises, ...loadedExercises];

        setExercises(allExercises);
        setBundledExerciseIds(new Set(loadedExercises.map((exercise) => exercise.id)));
        setCustomExerciseIds(new Set(customExercises.map((exercise) => exercise.id)));
        setSelectedId(allExercises[0]?.id ?? null);
        setProgressById(
          Object.fromEntries(
            allExercises
              .map((exercise) => [exercise.id, loadProgress(exercise.id)] as const)
              .filter((entry): entry is readonly [string, ExerciseProgress] => Boolean(entry[1])),
          ),
        );
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setLoadError(error instanceof Error ? error.message : "Error cargando ejercicios");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetch(`${import.meta.env.BASE_URL}glosario_ultimas_dos_paginas.md`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("No se pudo cargar el glosario.");
        }

        return response.text();
      })
      .then((markdown) => {
        if (isMounted) {
          setGlossaryMarkdown(markdown);
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setGlossaryError(
            error instanceof Error ? error.message : "No se pudo cargar el glosario.",
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedExercise = useMemo(
    () => exercises.find((exercise) => exercise.id === selectedId) ?? null,
    [exercises, selectedId],
  );

  useEffect(() => {
    if (!selectedExercise) {
      setFiles(emptyFiles);
      return;
    }

    setFiles(loadSavedCode(selectedExercise.id) ?? selectedExercise.starterCode);
    setActiveFile(getInitialActiveFile(selectedExercise));
    setConsoleLines([]);
    setValidationResults(createPendingResults(selectedExercise));
    setHasRunValidation(false);
    setShowGiveUpDialog(false);
    setPreviewNonce((current) => current + 1);
  }, [selectedExercise]);

  useEffect(() => {
    if (!selectedExercise) {
      return;
    }

    saveCode(selectedExercise.id, files);
  }, [files, selectedExercise]);

  const solutionChannelId = selectedExercise
    ? `solution:${selectedExercise.id}:${previewNonce}`
    : "solution:empty";

  useEffect(() => {
    function handlePreviewMessage(event: MessageEvent) {
      if (
        typeof event.data !== "object" ||
        event.data === null ||
        event.data.source !== "daw-preview" ||
        event.data.channelId !== solutionChannelId ||
        event.data.type !== "console"
      ) {
        return;
      }

      setConsoleLines((current) => [...current.slice(-20), String(event.data.payload)]);
    }

    window.addEventListener("message", handlePreviewMessage);
    return () => window.removeEventListener("message", handlePreviewMessage);
  }, [solutionChannelId]);

  const completedCount = useMemo(
    () => Object.values(progressById).filter((progress) => progress.completed).length,
    [progressById],
  );

  const handleSelectExercise = useCallback((exercise: Exercise) => {
    setSelectedId(exercise.id);
  }, []);

  const handleChangeFile = useCallback((file: ValidationField, value: string) => {
    setFiles((current) => ({
      ...current,
      [file]: value,
    }));
    setHasRunValidation(false);
  }, []);

  const handleCodeThemeChange = useCallback((themeId: CodeThemeId) => {
    setCodeThemeId(themeId);
    localStorage.setItem(codeThemeStorageKey, themeId);
  }, []);

  const handleHardModeChange = useCallback(() => {
    setHardMode((current) => {
      const next = !current;
      localStorage.setItem(hardModeStorageKey, next ? "on" : "off");

      if (next) {
        setShowGiveUpDialog(false);
      }

      return next;
    });
  }, []);

  const handleVimModeChange = useCallback((next: boolean) => {
    setVimMode(next);
    localStorage.setItem(vimModeStorageKey, next ? "on" : "off");
  }, []);

  const handleAutocompleteDisabledChange = useCallback((next: boolean) => {
    setAutocompleteDisabled(next);
    localStorage.setItem(autocompleteDisabledStorageKey, next ? "on" : "off");
  }, []);

  useEffect(() => {
    localStorage.setItem(previewLayoutStorageKey, previewLayout);
  }, [previewLayout]);

  useEffect(() => {
    localStorage.setItem(appThemeStorageKey, appTheme);
    document.documentElement.setAttribute("data-app-theme", appTheme);
  }, [appTheme]);

  const handleImportExercises = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList?.length) {
        return;
      }

      try {
        const parsedExercises = (
          await Promise.all(
            Array.from(fileList).map(async (file) => {
              const content = await file.text();
              return parseExerciseDocuments(JSON.parse(content));
            }),
          )
        ).flat();
        const uploadedIds = new Set<string>();

        parsedExercises.forEach((exercise) => {
          if (bundledExerciseIds.has(exercise.id)) {
            throw new Error(
              `El id "${exercise.id}" ya existe en los ejercicios incluidos.`,
            );
          }

          if (uploadedIds.has(exercise.id)) {
            throw new Error(`El id "${exercise.id}" esta repetido en la subida.`);
          }

          uploadedIds.add(exercise.id);
        });

        await saveCustomExercises(parsedExercises);

        const customExercises = await loadCustomExercises();
        const bundledExercises = exercises.filter(
          (exercise) => !customExerciseIds.has(exercise.id),
        );
        const allExercises = [...customExercises, ...bundledExercises];

        setExercises(allExercises);
        setCustomExerciseIds(new Set(customExercises.map((exercise) => exercise.id)));
        setSelectedId(parsedExercises[0]?.id ?? selectedId);
        setProgressById((current) => ({
          ...Object.fromEntries(
            customExercises
              .map((exercise) => [exercise.id, loadProgress(exercise.id)] as const)
              .filter((entry): entry is readonly [string, ExerciseProgress] =>
                Boolean(entry[1]),
              ),
          ),
          ...current,
        }));
        setImportStatus(
          `${parsedExercises.length} ejercicio${
            parsedExercises.length === 1 ? "" : "s"
          } subido${parsedExercises.length === 1 ? "" : "s"} a esta base local.`,
        );
      } catch (error) {
        setImportStatus(
          error instanceof Error
            ? error.message
            : "No se pudo subir el archivo de ejercicios.",
        );
      }
    },
    [bundledExerciseIds, customExerciseIds, exercises, selectedId],
  );

  const handleReset = useCallback(() => {
    if (!selectedExercise) {
      return;
    }

    setFiles(selectedExercise.starterCode);
    setConsoleLines([]);
    setValidationResults(createPendingResults(selectedExercise));
    setHasRunValidation(false);
    setPreviewNonce((current) => current + 1);
  }, [selectedExercise]);

  const handleRun = useCallback(() => {
    setConsoleLines([]);
    setPreviewNonce((current) => current + 1);
  }, []);

  const handleValidate = useCallback(() => {
    if (!selectedExercise) {
      return;
    }

    const results = validateExercise(
      selectedExercise.validation.rules,
      files,
      consoleLines,
    );
    const isCompleted = results.every((result) => result.passed);
    const currentProgress = progressById[selectedExercise.id];
    const nextProgress: ExerciseProgress = {
      completed: currentProgress?.completed || isCompleted,
      attempts: (currentProgress?.attempts ?? 0) + 1,
      lastEditedAt: new Date().toISOString(),
    };

    setValidationResults(results);
    setHasRunValidation(true);
    setProgressById((current) => ({
      ...current,
      [selectedExercise.id]: nextProgress,
    }));
    saveProgress(selectedExercise.id, nextProgress);
  }, [consoleLines, files, progressById, selectedExercise]);

  const handleToggleCompleted = useCallback(() => {
    if (!selectedExercise) {
      return;
    }

    const current = progressById[selectedExercise.id];
    const next: ExerciseProgress = {
      completed: !(current?.completed ?? false),
      attempts: current?.attempts ?? 0,
      lastEditedAt: new Date().toISOString(),
    };

    setProgressById((prev) => ({ ...prev, [selectedExercise.id]: next }));
    saveProgress(selectedExercise.id, next);
  }, [progressById, selectedExercise]);

  const handleToggleSidebar = useCallback(() => {
    setSidebarHidden((prev) => {
      const next = !prev;
      localStorage.setItem(sidebarHiddenStorageKey, next ? "on" : "off");
      return next;
    });
  }, []);

  const handleCopySolution = useCallback(() => {
    if (!selectedExercise?.targetCode) {
      return;
    }

    setFiles(selectedExercise.targetCode);
    setShowGiveUpDialog(false);
    setPreviewNonce((current) => current + 1);
  }, [selectedExercise]);

  if (loadError) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
        <AlertCircle size={32} className="text-destructive" aria-hidden />
        <h1 className="m-0 text-lg font-semibold">
          No se pudieron cargar los ejercicios
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground">{loadError}</p>
      </main>
    );
  }

  if (!selectedExercise) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
        <Sparkles size={28} className="text-muted-foreground" aria-hidden />
        <h1 className="m-0 text-lg font-semibold">
          Cargando tu laboratorio DAW…
        </h1>
      </main>
    );
  }

  const hasTarget = Boolean(selectedExercise.targetCode);
  const currentProgress = progressById[selectedExercise.id];
  const isSelectedExerciseNew = isNewExercise(selectedExercise, now);
  const isServerSideExercise = isServerSideTopic(selectedExercise.topic);
  const canShowPreview = !isServerSideExercise && isPreviewType(selectedExercise);
  const exerciseFileLabels = getExerciseFileLabels(selectedExercise);
  const exerciseFileLanguages = getExerciseFileLanguages(selectedExercise);
  const previewFiles = createExercisePreviewFiles(files, selectedExercise.preview);
  const targetPreviewFiles = selectedExercise.targetCode
    ? createExercisePreviewFiles(selectedExercise.targetCode, selectedExercise.preview)
    : null;
  const previewGridClass =
    previewLayout === "left"
      ? "grid items-start gap-4 [grid-template-areas:'editor''preview''checks'] xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] xl:[grid-template-areas:'preview_editor''preview_checks']"
      : previewLayout === "below"
        ? "grid items-start gap-4 [grid-template-areas:'editor''preview''checks']"
        : "grid items-start gap-4 [grid-template-areas:'editor''preview''checks'] xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] xl:[grid-template-areas:'editor_preview''checks_preview']";

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className={cn(
          "grid min-h-screen bg-background",
          sidebarHidden ? "lg:grid-cols-[minmax(0,1fr)]" : "lg:grid-cols-[280px_minmax(0,1fr)]",
        )}
      >
        {sidebarHidden ? null : (
          <ExerciseList
            exercises={exercises}
            selectedId={selectedExercise.id}
            topic={topic}
            progressById={progressById}
            repositoryUrl={repositoryUrl}
            customExerciseCount={customExerciseIds.size}
            now={now}
            onTopicChange={setTopic}
            onSelect={handleSelectExercise}
            onImportExercises={handleImportExercises}
            onHide={handleToggleSidebar}
          />
        )}

        {sidebarHidden ? (
          <Button
            variant="outline"
            size="icon"
            onClick={handleToggleSidebar}
            title="Mostrar lista de ejercicios"
            aria-label="Mostrar lista de ejercicios"
            className="fixed left-3 top-3 z-40 shadow-md"
          >
            <PanelLeftOpen size={16} aria-hidden />
          </Button>
        ) : null}

        <main className="flex min-w-0 flex-col gap-5 p-4 sm:p-6">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="m-0 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {topicLabels[selectedExercise.topic]}
              </p>
              <h1 className="m-0 mt-1 text-xl font-semibold leading-tight tracking-tight sm:text-2xl">
                {selectedExercise.title}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" asChild>
                <a href={repositoryUrl} target="_blank" rel="noreferrer">
                  <Github size={14} aria-hidden />
                  Repo
                </a>
              </Button>
              <Button variant="outline" onClick={() => setShowGlossary(true)}>
                <BookMarked size={14} aria-hidden />
                Ver glosario
              </Button>
              <div
                className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium tabular-nums text-muted-foreground"
                title="Ejercicios completados"
              >
                <CheckCircle2 size={14} aria-hidden />
                <span className="font-semibold text-foreground">
                  {completedCount}
                </span>
                <span className="opacity-60">/</span>
                <span>{exercises.length}</span>
              </div>
              <label className="relative inline-flex items-center">
                <Palette
                  size={14}
                  className="pointer-events-none absolute left-2.5 text-muted-foreground"
                  aria-hidden
                />
                <select
                  value={appTheme}
                  onChange={(event) => {
                    if (isAppTheme(event.target.value)) {
                      setAppTheme(event.target.value);
                    }
                  }}
                  aria-label="Tema de la app"
                  className="h-9 max-w-[10.5rem] rounded-md border bg-background py-0 pl-8 pr-7 text-xs font-medium text-foreground outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="classic">Tema clasico</option>
                  {codeThemeOptions.map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      {theme.label}
                    </option>
                  ))}
                </select>
              </label>
              <Button variant="outline" onClick={handleRun}>
                <Play size={14} aria-hidden />
                Ejecutar
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={hardMode ? "default" : "outline"}
                    onClick={handleHardModeChange}
                    aria-pressed={hardMode}
                  >
                    <ShieldQuestion size={14} aria-hidden />
                    {hardMode ? "Difícil" : "Normal"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="font-bold">Modo difícil</p>
                    <p className="text-xs text-muted-foreground">
                      Oculta los criterios de validación para una mayor
                      dificultad.
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
              <Button
                variant={currentProgress?.completed ? "default" : "outline"}
                onClick={handleToggleCompleted}
                aria-pressed={Boolean(currentProgress?.completed)}
                title={currentProgress?.completed ? "Desmarcar como hecha" : "Marcar como hecha"}
              >
                <CheckCircle2 size={14} aria-hidden />
                {currentProgress?.completed ? "Hecha" : "Marcar hecha"}
              </Button>
              <Button onClick={handleValidate}>
                <ListChecks size={14} aria-hidden />
                Comprobar
              </Button>
              {!hardMode && !isServerSideExercise ? (
                <Button
                  variant="outline"
                  onClick={() => setShowGiveUpDialog(true)}
                  title="Ver solución"
                >
                  <Lightbulb size={14} aria-hidden />
                  Ver solución
                </Button>
              ) : null}
            </div>
          </header>

          <Card className="p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <BookOpen size={16} className="text-muted-foreground" aria-hidden />
              <h2 className="m-0 text-sm font-semibold">Enunciado</h2>
            </div>
            <div className="space-y-2 text-[0.92rem] leading-relaxed text-foreground">
              {selectedExercise.prompt.split("\n").map((line, index) => (
                <p key={`${selectedExercise.id}-prompt-${index}`} className="m-0 max-w-[70ch]">
                  {renderInlineMarkdown(line)}
                </p>
              ))}
            </div>

            {selectedExercise.assets?.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {selectedExercise.assets.map((asset) => (
                  <figure
                    key={asset.src}
                    className="m-0 overflow-hidden rounded-md border bg-secondary/30"
                  >
                    <img
                      src={assetSource(asset.src)}
                      alt={asset.alt ?? asset.title ?? "Referencia del ejercicio"}
                      className="max-h-[520px] w-full object-contain"
                      loading="lazy"
                    />
                    {asset.title ? (
                      <figcaption className="border-t px-3 py-2 text-xs text-muted-foreground">
                        {asset.title}
                      </figcaption>
                    ) : null}
                  </figure>
                ))}
              </div>
            ) : null}

            {!hardMode && selectedExercise.notes?.length ? (
              <ul className="m-0 mt-3 grid list-disc gap-1.5 pl-5 text-sm text-muted-foreground">
                {selectedExercise.notes.map((note) => (
                  <li key={note} className="leading-snug">
                    {note}
                  </li>
                ))}
              </ul>
            ) : null}

            <Separator className="my-4" />

            <div className="flex flex-wrap gap-1.5">
              {customExerciseIds.has(selectedExercise.id) ? (
                <Badge variant="muted">
                  <Database size={12} aria-hidden />
                  Subido
                </Badge>
              ) : null}
              {isSelectedExerciseNew ? <Badge>Nuevo</Badge> : null}
              <Badge variant="muted">
                {getExerciseTypeLabel(selectedExercise.type)}
              </Badge>
              <Badge variant="muted">{selectedExercise.estimatedMinutes} min</Badge>
              <Badge variant="muted" className="capitalize">
                {selectedExercise.difficulty}
              </Badge>
              {currentProgress ? (
                <Badge variant="muted">{currentProgress.attempts} intentos</Badge>
              ) : null}
            </div>
            {importStatus ? (
              <p className="m-0 mt-3 text-xs text-muted-foreground">
                {importStatus}
              </p>
            ) : null}
          </Card>

          <div className={previewGridClass}>
            <div className="[grid-area:editor]">
              {selectedExercise.type === "table-answer" &&
              selectedExercise.tableQuestion ? (
                <TableAnswer
                  question={selectedExercise.tableQuestion}
                  value={files.html}
                  onChange={(value) => handleChangeFile("html", value)}
                />
              ) : (
                <CodeEditor
                  files={files}
                  activeFile={activeFile}
                  fileLabels={exerciseFileLabels}
                  fileLanguages={exerciseFileLanguages}
                  codeThemeId={codeThemeId}
                  vimMode={vimMode}
                  autocompleteDisabled={autocompleteDisabled}
                  previewLayout={previewLayout}
                  onActiveFileChange={setActiveFile}
                  onChange={handleChangeFile}
                  onCodeThemeChange={handleCodeThemeChange}
                  onVimModeChange={handleVimModeChange}
                  onAutocompleteDisabledChange={handleAutocompleteDisabledChange}
                  onReset={handleReset}
                  onPreviewLayoutChange={setPreviewLayout}
                  resizable
                />
              )}
            </div>

            <Card
              className="flex flex-col gap-3 p-4 [grid-area:preview]"
              aria-label="Previsualización"
            >
              <div className="flex items-center justify-between gap-3 border-b pb-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Eye size={16} className="text-muted-foreground" aria-hidden />
                  <h2 className="m-0 text-sm font-semibold">
                    {isServerSideExercise
                      ? "Validación estructural"
                      : canShowPreview && hasTarget
                        ? "Preview y objetivo"
                        : canShowPreview
                          ? "Preview"
                          : "Modo de respuesta"}
                  </h2>
                </div>
              </div>

              {isServerSideExercise ? (
                <div className="grid min-h-[360px] place-items-center rounded-md border bg-secondary/40 p-6 text-center">
                  <div className="grid max-w-md gap-3">
                    <p className="m-0 text-sm font-semibold text-foreground">
                      Ejercicio de código servidor
                    </p>
                    <p className="m-0 text-sm leading-relaxed text-muted-foreground">
                      JSP y Servlets se comprueban con reglas sobre tus archivos.
                      La ejecución real requiere un contenedor Java como Tomcat.
                    </p>
                    <div className="mt-1 flex flex-wrap justify-center gap-1.5">
                      {(["html", "css", "javascript"] as ValidationField[]).map((field) => (
                        <Badge key={field} variant="muted">
                          {getFileLabel(selectedExercise.topic, field)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ) : canShowPreview ? (
                <div
                  className={
                    hasTarget
                      ? "grid grid-cols-1 gap-3 md:grid-cols-2"
                      : "grid gap-3"
                  }
                >
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
                      Tu resultado
                    </span>
                    <PreviewFrame
                      files={previewFiles}
                      title="Tu resultado"
                      channelId={solutionChannelId}
                      resizable
                    />
                  </div>

                  {targetPreviewFiles ? (
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
                        Objetivo
                      </span>
                      <PreviewFrame
                        files={targetPreviewFiles}
                        title="Objetivo"
                        channelId={`target:${selectedExercise.id}`}
                        resizable
                      />
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="grid min-h-[220px] place-items-center rounded-md border bg-secondary/40 p-6 text-center">
                  <div className="grid max-w-md gap-3">
                    <FileText
                      size={24}
                      className="mx-auto text-muted-foreground"
                      aria-hidden
                    />
                    <p className="m-0 text-sm font-semibold text-foreground">
                      Respuesta sin iframe
                    </p>
                    <p className="m-0 text-sm leading-relaxed text-muted-foreground">
                      Este modo se corrige con reglas sobre tu respuesta escrita o
                      con la tabla del enunciado. Usa las imagenes de referencia si
                      necesitas consultar las figuras del examen.
                    </p>
                  </div>
                </div>
              )}

              {consoleLines.length ? (
                <div
                  className="grid max-h-40 gap-1 overflow-auto rounded-md border bg-code p-3 font-mono text-xs text-code-foreground"
                  aria-label="Consola"
                >
                  {consoleLines.map((line, index) => (
                    <code key={`${line}-${index}`} className="leading-snug">
                      {line}
                    </code>
                  ))}
                </div>
              ) : null}
            </Card>

            <div className="[grid-area:checks]">
              <ValidationPanel
                results={validationResults}
                successMessage={selectedExercise.validation.successMessage}
                hasRunValidation={hasRunValidation}
                hideCriteria={hardMode}
              />
            </div>
          </div>

          <GiveUpDialog
            open={showGiveUpDialog}
            onOpenChange={setShowGiveUpDialog}
            userFiles={files}
            targetCode={selectedExercise.targetCode}
            activeFile={activeFile}
            validationResults={validationResults}
            hasRunValidation={hasRunValidation}
            fileLabels={{
              html:
                exerciseFileLabels.html ??
                getFileLabel(selectedExercise.topic, "html"),
              css:
                exerciseFileLabels.css ??
                getFileLabel(selectedExercise.topic, "css"),
              javascript:
                exerciseFileLabels.javascript ??
                getFileLabel(selectedExercise.topic, "javascript"),
            }}
            onCopySolution={handleCopySolution}
          />

          {showGlossary ? (
            <div
              className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              aria-labelledby="glossary-title"
            >
              <Card className="flex max-h-[min(760px,92vh)] w-full max-w-4xl flex-col overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <img
                      src={`${import.meta.env.BASE_URL}logo-daw.png`}
                      alt=""
                      className="h-8 w-8 rounded-md object-cover"
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <h2
                        id="glossary-title"
                        className="m-0 text-base font-semibold leading-tight"
                      >
                        Glosario DAW
                      </h2>
                      <p className="m-0 mt-0.5 text-xs text-muted-foreground">
                        Ultimas dos paginas de apuntes de examen
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowGlossary(false)}
                    aria-label="Cerrar glosario"
                  >
                    <X size={16} aria-hidden />
                  </Button>
                </div>
                <div className="scrollbar-thin grid gap-4 overflow-auto p-4 text-sm">
                  {glossaryError ? (
                    <p className="m-0 text-destructive">{glossaryError}</p>
                  ) : glossaryMarkdown ? (
                    renderGlossaryMarkdown(glossaryMarkdown)
                  ) : (
                    <p className="m-0 text-muted-foreground">Cargando glosario...</p>
                  )}
                </div>
              </Card>
            </div>
          ) : null}
        </main>
      </div>
    </TooltipProvider>
  );
}
