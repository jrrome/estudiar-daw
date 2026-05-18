import type { CodeFiles, Exercise, Topic, ValidationField } from "./types";

const databaseName = "daw-practice-lab";
const databaseVersion = 1;
const exerciseStoreName = "customExercises";

type CustomExerciseDocument = Exercise & {
  createdAt: string;
  updatedAt: string;
};

const topics: Topic[] = ["html", "css", "javascript", "jsp", "servlets", "examen"];
const difficulties = ["base", "media", "reto"];
const exerciseTypes = ["build", "visual-match", "written-answer", "table-answer"];
const codeFields: ValidationField[] = ["html", "css", "javascript"];

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(exerciseStoreName)) {
        database.createObjectStore(exerciseStoreName, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runStoreTransaction<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(exerciseStoreName, mode);
        const store = transaction.objectStore(exerciseStoreName);
        const request = callback(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => database.close();
        transaction.onerror = () => {
          database.close();
          reject(transaction.error);
        };
      }),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCodeFiles(value: unknown): value is CodeFiles {
  return (
    isRecord(value) &&
    codeFields.every((field) => typeof value[field] === "string")
  );
}

export function parseExerciseDocuments(value: unknown): Exercise[] {
  if (Array.isArray(value)) {
    return value.map(parseExerciseDocument);
  }

  if (isRecord(value) && Array.isArray(value.exercises)) {
    return value.exercises.map(parseExerciseDocument);
  }

  return [parseExerciseDocument(value)];
}

function parseExerciseDocument(value: unknown): Exercise {
  if (!isRecord(value)) {
    throw new Error("El archivo no contiene un ejercicio valido.");
  }

  const {
    id,
    topic,
    type,
    title,
    difficulty,
    estimatedMinutes,
    publishedAt,
    prompt,
    notes,
    assets,
    editor,
    preview,
    tableQuestion,
    starterCode,
    targetCode,
    validation,
  } = value;

  if (typeof id !== "string" || !id.trim()) {
    throw new Error("Cada ejercicio necesita un id.");
  }

  if (!topics.includes(topic as Topic)) {
    throw new Error(`El ejercicio ${id} tiene un topic no soportado.`);
  }

  if (!exerciseTypes.includes(String(type))) {
    throw new Error(`El ejercicio ${id} tiene un type no soportado.`);
  }

  if (typeof title !== "string" || !title.trim()) {
    throw new Error(`El ejercicio ${id} necesita title.`);
  }

  if (!difficulties.includes(String(difficulty))) {
    throw new Error(`El ejercicio ${id} tiene difficulty no soportada.`);
  }

  if (typeof estimatedMinutes !== "number" || estimatedMinutes <= 0) {
    throw new Error(`El ejercicio ${id} necesita estimatedMinutes positivo.`);
  }

  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new Error(`El ejercicio ${id} necesita prompt.`);
  }

  if (!isCodeFiles(starterCode)) {
    throw new Error(`El ejercicio ${id} necesita starterCode completo.`);
  }

  if (targetCode !== undefined && !isCodeFiles(targetCode)) {
    throw new Error(`El ejercicio ${id} tiene targetCode incompleto.`);
  }

  if (
    !isRecord(validation) ||
    validation.mode !== "all" ||
    typeof validation.successMessage !== "string" ||
    !Array.isArray(validation.rules)
  ) {
    throw new Error(`El ejercicio ${id} necesita validation.mode, successMessage y rules.`);
  }

  return {
    id,
    topic: topic as Exercise["topic"],
    type: type as Exercise["type"],
    title,
    difficulty: difficulty as Exercise["difficulty"],
    estimatedMinutes,
    publishedAt: typeof publishedAt === "string" ? publishedAt : undefined,
    prompt,
    notes: Array.isArray(notes) ? notes.filter((note) => typeof note === "string") : undefined,
    assets: Array.isArray(assets)
      ? (assets as Exercise["assets"])
      : undefined,
    editor: isRecord(editor) ? (editor as Exercise["editor"]) : undefined,
    preview: isRecord(preview) ? (preview as Exercise["preview"]) : undefined,
    tableQuestion: isRecord(tableQuestion)
      ? (tableQuestion as Exercise["tableQuestion"])
      : undefined,
    starterCode,
    targetCode,
    validation: {
      mode: "all",
      successMessage: validation.successMessage,
      rules: validation.rules as Exercise["validation"]["rules"],
    },
  };
}

export async function loadCustomExercises(): Promise<Exercise[]> {
  const documents = await runStoreTransaction<CustomExerciseDocument[]>(
    "readonly",
    (store) => store.getAll(),
  );

  return documents
    .map(({ createdAt: _createdAt, updatedAt: _updatedAt, ...exercise }) => exercise)
    .sort((a, b) => a.title.localeCompare(b.title));
}

export async function saveCustomExercises(exercises: Exercise[]): Promise<void> {
  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const now = new Date().toISOString();
    const transaction = database.transaction(exerciseStoreName, "readwrite");
    const store = transaction.objectStore(exerciseStoreName);

    exercises.forEach((exercise) => {
      store.put({
        ...exercise,
        createdAt: now,
        updatedAt: now,
      } satisfies CustomExerciseDocument);
    });

    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}
