"use client";

import { useCallback, useMemo } from "react";
import {
  FormatBoldOutlined,
  FormatItalicOutlined,
  FormatUnderlinedOutlined,
  FormatListBulletedOutlined,
  CheckBoxOutlined,
  CodeOutlined,
} from "@mui/icons-material";
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
  /** Barre d'outils persistante au-dessus de la zone d'édition. */
  toolbar?: boolean;
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
  toolbar = true,
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

  const toggleStyle = useCallback(
    (style: "bold" | "italic" | "underline" | "code") => {
      editor.focus();
      editor.toggleStyles({ [style]: true });
    },
    [editor],
  );

  const setBlockType = useCallback(
    (update: PartialBlock) => {
      editor.focus();
      const { block } = editor.getTextCursorPosition();
      editor.updateBlock(block, update);
    },
    [editor],
  );

  return (
    <div className={className}>
      {editable && toolbar && (
        <div className="flex items-center gap-0.5 flex-wrap px-10 py-2 border-b border-outline-soft">
          <ToolbarButton label="Gras" onClick={() => toggleStyle("bold")}>
            <FormatBoldOutlined style={{ fontSize: 17 }} />
          </ToolbarButton>
          <ToolbarButton label="Italique" onClick={() => toggleStyle("italic")}>
            <FormatItalicOutlined style={{ fontSize: 17 }} />
          </ToolbarButton>
          <ToolbarButton label="Souligné" onClick={() => toggleStyle("underline")}>
            <FormatUnderlinedOutlined style={{ fontSize: 17 }} />
          </ToolbarButton>

          <span className="w-px h-4 bg-outline-soft mx-1" />

          <ToolbarButton
            label="Titre 1"
            onClick={() => setBlockType({ type: "heading", props: { level: 1 } })}
          >
            <span className="text-[12px] font-semibold">H1</span>
          </ToolbarButton>
          <ToolbarButton
            label="Titre 2"
            onClick={() => setBlockType({ type: "heading", props: { level: 2 } })}
          >
            <span className="text-[12px] font-semibold">H2</span>
          </ToolbarButton>

          <span className="w-px h-4 bg-outline-soft mx-1" />

          <ToolbarButton label="Liste" onClick={() => setBlockType({ type: "bulletListItem" })}>
            <FormatListBulletedOutlined style={{ fontSize: 17 }} />
          </ToolbarButton>
          <ToolbarButton
            label="Case à cocher"
            onClick={() => setBlockType({ type: "checkListItem" })}
          >
            <CheckBoxOutlined style={{ fontSize: 17 }} />
          </ToolbarButton>
          <ToolbarButton label="Code" onClick={() => toggleStyle("code")}>
            <CodeOutlined style={{ fontSize: 17 }} />
          </ToolbarButton>

          <span className="ml-auto text-[11px] text-outline whitespace-nowrap">
            Tapez « / » pour les blocs
          </span>
        </div>
      )}

      <BlockNoteView
        editor={editor}
        editable={editable}
        onChange={onChange ? handleChange : undefined}
        theme="light"
      />
    </div>
  );
}

function ToolbarButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="w-7 h-7 flex items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors"
    >
      {children}
    </button>
  );
}

export default BlockNoteEditor;
