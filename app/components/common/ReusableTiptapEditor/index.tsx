'use client';

// 1. 确保从 react 导入 useEffect 和 useRef
import React, { useCallback, useRef, useEffect } from "react";
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
  // 2. 创建一个 ref 来引用 textarea 元素
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
  
  // 3. 使用 useEffect 来手动控制焦点和光标位置
  useEffect(() => {
    if (textareaRef.current) {
      // 获取当前文本长度
      const textLength = textareaRef.current.value.length;
      // 手动设置焦点
      textareaRef.current.focus();
      // 将光标的起始和结束位置都设置到文本末尾
      textareaRef.current.setSelectionRange(textLength, textLength);
    }
  }, []); // [] 依赖项确保这个 effect 只在组件挂载时运行一次

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
          // 4. 移除 autoFocus，并将 ref 传递给子组件
          ref={textareaRef}
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