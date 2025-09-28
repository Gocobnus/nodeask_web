"use client";

import React, { useState } from "react"; // Import useState
import ReusableTiptapEditor from "../common/ReusableTiptapEditor";
import "./homepage.css";

interface SearchSectionProps {
  title: string;
  placeholder: string;
  onSubmit: (value: string) => Promise<void> | void; // Can be async
  disabled?: boolean;
}

export default function SearchSection({ 
  title,
  placeholder,
  onSubmit,
  disabled = false
}: SearchSectionProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (submittedContent: string) => {
    if (!submittedContent) return;
    setIsSubmitting(true);
    try {
      await onSubmit(submittedContent);
      // On successful submission, navigation will occur, so no state reset is needed.
    } catch (error) {
      // Only reset submitting state if an error occurs and the user stays on the page.
      console.error("Submission failed:", error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="search-section__container">
      {/* 标题 */}
      <h1 className="search-section__title">{title}</h1>
      
      {/* 输入区域 */}
      <ReusableTiptapEditor 
        key="homepage-search-section"
        placeholder={placeholder} 
        disabled={disabled}
        content={content}
        onUpdate={setContent}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
