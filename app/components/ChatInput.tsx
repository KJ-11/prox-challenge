"use client";

import {
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  type ClipboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { ArrowUp, Mic, Paperclip, Square, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChatInputProps {
  onSend: (text: string, images: File[]) => void;
  onStop: () => void;
  isStreaming: boolean;
  /** Forwarded so the parent can programmatically focus (⌘K). */
  inputRef?: React.Ref<HTMLTextAreaElement>;
  autoFocus?: boolean;
  prefilledText?: string;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES =
  "image/png,image/jpeg,image/webp,image/gif";

export function ChatInput({
  onSend,
  onStop,
  isStreaming,
  inputRef,
  autoFocus,
  prefilledText,
}: ChatInputProps): React.JSX.Element {
  const [text, setText] = useState(prefilledText ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const refCallback = useCallback(
    (node: HTMLTextAreaElement | null) => {
      (internalRef as { current: HTMLTextAreaElement | null }).current = node;
      if (typeof inputRef === "function") inputRef(node);
      else if (inputRef && "current" in inputRef) {
        (inputRef as { current: HTMLTextAreaElement | null }).current = node;
      }
    },
    [inputRef],
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep textarea height tight to content.
  useEffect(() => {
    const el = internalRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [text]);

  useEffect(() => {
    if (prefilledText !== undefined) {
      setText(prefilledText);
      internalRef.current?.focus();
    }
  }, [prefilledText]);

  useEffect(() => {
    if (autoFocus) internalRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback((incoming: File[]) => {
    const accepted: File[] = [];
    const newPreviews: string[] = [];
    for (const f of incoming) {
      if (!f.type.startsWith("image/")) continue;
      if (f.size > MAX_IMAGE_BYTES) continue;
      accepted.push(f);
      newPreviews.push(URL.createObjectURL(f));
    }
    if (accepted.length > 0) {
      setFiles((prev) => [...prev, ...accepted]);
      setPreviews((prev) => [...prev, ...newPreviews]);
    }
  }, []);

  const removeImage = useCallback(
    (index: number) => {
      setFiles((prev) => prev.filter((_, i) => i !== index));
      setPreviews((prev) => {
        const url = prev[index];
        if (url) URL.revokeObjectURL(url);
        return prev.filter((_, i) => i !== index);
      });
    },
    [],
  );

  const submit = useCallback(() => {
    if (isStreaming) return;
    const trimmed = text.trim();
    if (!trimmed && files.length === 0) return;
    onSend(trimmed, files);
    setText("");
    setFiles([]);
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews([]);
  }, [files, isStreaming, onSend, previews, text]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        submit();
      }
    },
    [submit],
  );

  const onPaste = useCallback(
    (e: ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const pastedFiles: File[] = [];
      for (const item of items) {
        if (item.kind === "file") {
          const f = item.getAsFile();
          if (f && f.type.startsWith("image/")) pastedFiles.push(f);
        }
      }
      if (pastedFiles.length > 0) {
        e.preventDefault();
        addFiles(pastedFiles);
      }
    },
    [addFiles],
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped: File[] = [];
      if (e.dataTransfer.files) {
        for (const f of e.dataTransfer.files) {
          if (f.type.startsWith("image/")) dropped.push(f);
        }
      }
      if (dropped.length > 0) addFiles(dropped);
    },
    [addFiles],
  );

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (e.currentTarget === e.target) setIsDragging(false);
  }, []);

  const onFileInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) addFiles(Array.from(e.target.files));
      e.target.value = "";
    },
    [addFiles],
  );

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "rounded-2xl border bg-[color:var(--color-surface)] shadow-xs transition-colors",
        isDragging
          ? "border-[color:var(--color-brand)] bg-[color:var(--color-brand-soft)]"
          : "border-[color:var(--color-border)]",
      )}
    >
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b border-[color:var(--color-border)] p-2">
          {previews.map((url, i) => (
            <div
              key={url}
              className="relative h-16 w-16 overflow-hidden rounded-md border border-[color:var(--color-border)]"
            >
              <Image
                src={url}
                alt="Attachment preview"
                fill
                unoptimized
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute right-0.5 top-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                aria-label="Remove attachment"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mb-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[color:var(--color-muted)] transition-colors hover:bg-[color:var(--color-surface-muted)] hover:text-[color:var(--color-foreground)]"
          aria-label="Attach image"
          title="Attach image"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          multiple
          onChange={onFileInput}
          className="hidden"
        />

        <textarea
          ref={refCallback}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder="Ask about the OmniPro 220 — or drop a weld photo here."
          rows={1}
          className="flex-1 resize-none bg-transparent py-1.5 text-sm text-[color:var(--color-foreground)] placeholder:text-[color:var(--color-muted)] focus:outline-none"
        />

        <button
          type="button"
          disabled
          className="mb-1 inline-flex h-8 w-8 shrink-0 cursor-not-allowed items-center justify-center rounded-md text-[color:var(--color-muted)]/60"
          title="Voice input coming soon"
          aria-label="Voice input (coming soon)"
        >
          <Mic className="h-4 w-4" />
        </button>

        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            className="mb-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[color:var(--color-foreground)] text-[color:var(--color-background)] transition-colors hover:opacity-85"
            aria-label="Stop generating"
            title="Stop generating"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!text.trim() && files.length === 0}
            className={cn(
              "mb-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors",
              text.trim() || files.length > 0
                ? "bg-[color:var(--color-brand)] text-white hover:bg-[color:var(--color-brand-strong)]"
                : "bg-[color:var(--color-surface-muted)] text-[color:var(--color-muted)]",
            )}
            aria-label="Send message"
            title="Send (Enter)"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
