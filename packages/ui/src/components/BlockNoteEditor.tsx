"use client";

import { useCallback, useMemo } from "react";
import type { Block, PartialBlock } from "@blocknote/core";
import { fr } from "@blocknote/core/locales";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import "./blocknote-theme.css";

export interface BlockNoteEditorProps {
  /** Document BlockNote sérialisé (JSON). */
  value?: string | null;
  /** Texte brut de repli, converti en paragraphes si `value` est vide (contenu legacy). */
  fallbackText?: string | null;
  editable?: boolean;
  placeholder?: string;
  onChange?: (json: string) => void;
  className?: string;
}

function toInitialContent(value?: string | null, fallbackText?: string | null): PartialBlock[] | undefined {
  if (value && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as PartialBlock[];
    } catch {
      // Contenu non-JSON : on le traite comme du texte brut plus bas.
      return toParagraphs(value);
    }
  }
  return toParagraphs(fallbackText);
}

function toParagraphs(text?: string | null): PartialBlock[] | undefined {
  const lines = (text ?? "").split("\n").filter((l) => l.trim());
  if (!lines.length) return undefined;
  return lines.map((line) => ({ type: "paragraph", content: line }) as PartialBlock);
}

export function BlockNoteEditor({
  value,
  fallbackText,
  editable = true,
  placeholder,
  onChange,
  className,
}: BlockNoteEditorProps) {
  // Le contenu initial est figé au montage : l'éditeur est la source de vérité
  // ensuite, sinon chaque sauvegarde repasserait par une remontée de props et
  // replacerait le curseur au début.
  const initialContent = useMemo(
    () => toInitialContent(value, fallbackText),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const dictionary = useMemo(
    () => (placeholder ? { ...fr, placeholders: { ...fr.placeholders, default: placeholder } } : fr),
    [placeholder],
  );

  const editor = useCreateBlockNote({ initialContent, dictionary });

  const handleChange = useCallback(() => {
    onChange?.(JSON.stringify(editor.document as Block[]));
  }, [editor, onChange]);

  return (
    <BlockNoteView
      editor={editor}
      editable={editable}
      onChange={onChange ? handleChange : undefined}
      theme="light"
      className={className}
    />
  );
}

export default BlockNoteEditor;
