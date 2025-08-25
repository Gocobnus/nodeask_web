"use client";

import React from "react";
import { QCardProps } from "../../../types/qacard";
import "./questioncard.css";

export default function QuestionCard({
  question,
  onSubmit
}: QCardProps) {

  return (
    <div className="qcard__container">
      <div className="qcard__content">
        {question}
      </div>
      <div className="qcard__actions">
        <button 
          className="qcard__submit-btn"
          onClick={onSubmit}
          type="button"
        >
          提交
        </button>
      </div>
    </div>
  );
}
