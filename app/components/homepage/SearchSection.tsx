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
      setContent(""); // Clear input after successful submission
    } catch (error) {
      // Optionally handle submission errors here, e.g., show a toast
      console.error("Submission failed:", error);
    } finally {
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
