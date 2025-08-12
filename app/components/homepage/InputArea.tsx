"use client";

import React, { useState, useCallback, useEffect } from "react";
import { SendIcon } from "../icons";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

interface InputAreaProps {
  onSubmit?: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}

export default function InputArea({ 
  onSubmit, 
  placeholder,
  disabled = false 
}: InputAreaProps) {
  const [value, setValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 初始化 Tiptap 编辑器
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
        showOnlyWhenEditable: false,
        includeChildren: true,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: "",
    onUpdate: ({ editor }) => {
      setValue(editor.getText());
    },
    editable: !(disabled),
    // 避免 Next.js SSR / Hydration 不一致
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'search-section__input',
        style: 'outline:none;box-shadow:none;border:none;',
        'data-placeholder': placeholder,
      }
    }
  });

  // 同步禁用态到编辑器
  useEffect(() => {
    if (editor) {
      editor.setEditable(!(disabled || isSubmitting));
    }
  }, [editor, disabled, isSubmitting]);

  // 处理提交
  const handleSubmit = useCallback(async () => {
    if (!value.trim() || isSubmitting || disabled) return;

    setIsSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit(value.trim());
      }
      setValue("");
      if (editor) {
        editor.commands.clearContent(true);
      }
    } catch (error) {
      console.error('提交失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [value, isSubmitting, disabled, onSubmit, editor]);

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);



    return (
    <div className="search-section__input-container">
      <div className="search-section__inner-container">
        {/* 输入框（Tiptap） */}
        {editor ? (
          <EditorContent
            editor={editor}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <div
            className="search-section__input search-section__placeholder"
            data-placeholder={placeholder}
            aria-hidden="true"
          />
        )}

        {/* 底部区域 */}
        <div className="search-section__bottom-area">
          {/* 功能组件 */}
          <div className="search-section__function-component">
            {/* 暂时留空，为未来功能预留 */}
          </div>

          {/* 提交组件 */}
          <div className="search-section__submit-component">
            <button
              className="search-section__submit-button"
              onClick={handleSubmit}
              disabled={!value.trim() || isSubmitting || disabled}
              type="button"
            >
              {isSubmitting ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <SendIcon
                  className="text-current"
                />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
