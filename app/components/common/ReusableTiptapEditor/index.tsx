'use client';

import React, { useCallback, useRef } from "react";
import { SendIcon } from "../../icons";
import PromptInput from './PromptInputComponent';
import "./editor.css";

interface ReusableTiptapEditorProps {
  content: string;
  onUpdate: (newContent: string) => void;
  onSubmit: (submittedContent: string) => void;
  placeholder: string;
  disabled?: boolean;
  isSubmitting?: boolean;
  variant?: 'homepage' | 'bottomBar';
}

export default function ReusableTiptapEditor({
  content,
  onUpdate,
  onSubmit,
  placeholder,
  disabled = false,
  isSubmitting = false,
  variant = 'homepage',
}: ReusableTiptapEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSubmit = useCallback(() => {
    if (!content.trim() || isSubmitting || disabled) return;
    onSubmit(content);
  }, [content, isSubmitting, disabled, onSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) {
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!content.trim()) {
        return;
      }
      handleSubmit();
    }
  }, [content, handleSubmit]);

  const containerClass = variant === 'bottomBar'
    ? "bottom-editor__container"
    : "search-section__input-container";

  const maxRows = variant === 'bottomBar' ? 10 : 13;

  return (
    <div
      ref={containerRef}
      className={containerClass}
    >
      <div className="search-section__inner-container">
        <PromptInput
          autoFocus
          variant="flat"
          className="search-section__input"
          maxRows={maxRows}
          classNames={{
            inputWrapper: "!bg-transparent shadow-none",
            input: "transition-none",
          }}
          value={content}
          onValueChange={onUpdate}
          placeholder={placeholder}
          disabled={disabled || isSubmitting}
          onKeyDown={handleKeyDown}
        />
        <div className="search-section__bottom-area">
          <div className="search-section__function-component">
            {/* Placeholder */}
          </div>
          <div className="search-section__submit-component">
            <button
              className="search-section__submit-button"
              onClick={handleSubmit}
              disabled={!content.trim() || isSubmitting || disabled}
              type="button"
            >
              <SendIcon
                className="text-current"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}