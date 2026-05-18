import {
  CheckCircle2,
  Clock3,
  Database,
  Github,
  PanelLeftClose,
  Upload,
} from "lucide-react";
import { useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { isNewExercise } from "@/lib/exerciseFreshness";
import { cn } from "@/lib/utils";
import type { Exercise, ExerciseProgress, Topic } from "../lib/types";

type ExerciseListProps = {
  exercises: Exercise[];
  selectedId: string | null;
  topic: Topic | "todos";
  progressById: Record<string, ExerciseProgress>;
  repositoryUrl: string;
  customExerciseCount: number;
  now: number;
  onTopicChange: (topic: Topic | "todos") => void;
  onSelect: (exercise: Exercise) => void;
  onImportExercises: (files: FileList | null) => void;
  onHide: () => void;
};

const topicOptions: Array<{ value: Topic | "todos"; label: string }> = [
  { value: "todos", label: "Todos" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "javascript", label: "JS" },
  { value: "jsp", label: "JSP" },
  { value: "servlets", label: "Servlets" },
  { value: "examen", label: "Examen" },
];

const topicDotClass: Record<Topic, string> = {
  html: "bg-topic-html",
  css: "bg-topic-css",
  javascript: "bg-topic-javascript",
  jsp: "bg-topic-jsp",
  servlets: "bg-topic-servlets",
  examen: "bg-topic-examen",
};

export default function ExerciseList({
  exercises,
  selectedId,
  topic,
  progressById,
  repositoryUrl,
  customExerciseCount,
  now,
  onTopicChange,
  onSelect,
  onImportExercises,
  onHide,
}: ExerciseListProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const filteredExercises =
    topic === "todos"
      ? exercises
      : exercises.filter((exercise) => exercise.topic === topic);

  return (
    <aside className="flex max-h-[72vh] min-h-0 flex-col gap-4 overflow-hidden border-r bg-secondary/40 p-4 lg:sticky lg:top-0 lg:h-screen lg:max-h-none">
      <div className="flex items-center gap-3">
        <img
          src={`${import.meta.env.BASE_URL}logo-daw.png`}
          alt="Logo DAW"
          className="h-9 w-9 rounded-md object-cover shadow-sm"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-none">
            DAW Practice Lab
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {exercises.length} ejercicios
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={onHide}
          title="Ocultar barra lateral"
          aria-label="Ocultar barra lateral"
        >
          <PanelLeftClose size={16} aria-hidden />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" asChild>
          <a href={repositoryUrl} target="_blank" rel="noreferrer">
            <Github size={13} aria-hidden />
            Repo
          </a>
        </Button>
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={13} aria-hidden />
          Subir
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          multiple
          className="sr-only"
          onChange={(event) => {
            onImportExercises(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
        />
      </div>

      {customExerciseCount > 0 ? (
        <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground">
          <Database size={13} aria-hidden />
          <span>
            {customExerciseCount} ejercicio
            {customExerciseCount === 1 ? "" : "s"} en base local
          </span>
        </div>
      ) : null}

      <ToggleGroup
        type="single"
        value={topic}
        onValueChange={(value) => {
          if (value) onTopicChange(value as Topic | "todos");
        }}
        className="grid w-full grid-cols-3 rounded-md border bg-background p-0.5"
      >
        {topicOptions.map(({ value, label }) => (
          <ToggleGroupItem
            key={value}
            value={value}
            size="sm"
            className="h-7 w-full text-xs font-medium"
          >
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="flex items-center justify-between px-1 text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground/80">
        <span>Ejercicios</span>
        <span>{filteredExercises.length}</span>
      </div>

      <ScrollArea className="-mx-1 flex-1">
        <div className="flex flex-col gap-1 px-1">
          {filteredExercises.map((exercise) => {
            const progress = progressById[exercise.id];
            const isActive = selectedId === exercise.id;
            const isNew = isNewExercise(exercise, now);

            return (
              <button
                key={exercise.id}
                type="button"
                onClick={() => onSelect(exercise)}
                className={cn(
                  "group grid grid-cols-[10px_minmax(0,1fr)] items-start gap-3 rounded-md border border-transparent p-3 text-left transition-colors",
                  "hover:border-border hover:bg-background",
                  isActive && "border-border bg-background shadow-sm",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-1.5 h-2 w-2 rounded-full",
                    topicDotClass[exercise.topic],
                  )}
                />
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="break-words text-sm font-semibold leading-snug">
                    {exercise.title}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock3 size={12} aria-hidden />
                    {exercise.estimatedMinutes} min
                    <span className="opacity-50">·</span>
                    <span className="capitalize">{exercise.difficulty}</span>
                  </span>
                  {isNew || progress?.completed ? (
                    <span className="mt-1 flex flex-wrap gap-1">
                      {isNew ? <Badge>Nuevo</Badge> : null}
                      {progress?.completed ? (
                        <Badge variant="success">
                          <CheckCircle2 size={12} aria-hidden />
                          Hecho
                        </Badge>
                      ) : null}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </aside>
  );
}
