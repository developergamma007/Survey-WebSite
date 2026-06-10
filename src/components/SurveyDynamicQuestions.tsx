"use client";

import { Plus, Trash2 } from "lucide-react";
import {
  splitPipeText,
  parseQuestionConfig,
  questionAnswerKey,
  defaultTextFieldTemplates,
  emptyTextAnswerRow,
  isGenericTextFieldKey,
  parseTextAnswerRows,
  serializeTextAnswerRows,
} from "@/lib/surveyText";

export type SurveyQuestionItem = {
  id: number;
  text: string;
  options: string;
};

type Props = {
  questions: SurveyQuestionItem[];
  answers: Record<string, string>;
  onChange: (questionText: string, value: string) => void;
  title?: string;
};

function TextInputQuestion({
  groupName,
  answerKey,
  fieldTemplates,
  answers,
  onChange,
}: {
  groupName: string;
  answerKey: string;
  fieldTemplates: string[];
  answers: Record<string, string>;
  onChange: (questionText: string, value: string) => void;
}) {
  const templates = defaultTextFieldTemplates(fieldTemplates);
  const rows = parseTextAnswerRows(answers[answerKey], templates);

  const commitRows = (nextRows: Array<Record<string, string>>) => {
    onChange(answerKey, serializeTextAnswerRows(nextRows));
  };

  const updateCell = (rowIndex: number, field: string, value: string) => {
    commitRows(
      rows.map((row, index) => (index === rowIndex ? { ...row, [field]: value } : row))
    );
  };

  const addRow = () => {
    commitRows([...rows, emptyTextAnswerRow(templates)]);
  };

  const removeRow = (rowIndex: number) => {
    if (rows.length <= 1) return;
    commitRows(rows.filter((_, index) => index !== rowIndex));
  };

  return (
    <div className="survey-text-fields">
      {rows.map((row, rowIndex) => (
        <div key={`${groupName}-row-${rowIndex}`} className="survey-text-entry-card">
          <div className="survey-text-entry-header">
            <span className="survey-text-entry-num">Entry {rowIndex + 1}</span>
            {rows.length > 1 ? (
              <button
                type="button"
                className="survey-text-remove-btn"
                onClick={() => removeRow(rowIndex)}
                aria-label={`Remove entry ${rowIndex + 1}`}
              >
                <Trash2 size={12} />
                Remove
              </button>
            ) : null}
          </div>
          {templates.map((field, fieldIndex) => {
            const hideLabel = isGenericTextFieldKey(field);
            return (
              <div key={`${groupName}-${rowIndex}-${fieldIndex}`} className="survey-text-field-row">
                {!hideLabel ? (
                  <label
                    className="survey-text-field-label"
                    htmlFor={`${groupName}-${rowIndex}-${fieldIndex}`}
                  >
                    {field}
                  </label>
                ) : null}
                <input
                  id={`${groupName}-${rowIndex}-${fieldIndex}`}
                  type="text"
                  value={row[field] || ""}
                  onChange={(e) => updateCell(rowIndex, field, e.target.value)}
                  placeholder={hideLabel ? "Type your answer" : `Enter ${field.toLowerCase()}`}
                  className="survey-text-field-input"
                  aria-label={hideLabel ? `Entry ${rowIndex + 1}` : field}
                />
              </div>
            );
          })}
        </div>
      ))}
      <button type="button" className="survey-text-add-btn" onClick={addRow}>
        <Plus size={14} />
        Add
      </button>
    </div>
  );
}

export default function SurveyDynamicQuestions({
  questions,
  answers,
  onChange,
  title = "Ward Specific Questions",
}: Props) {
  if (!questions.length) return null;

  return (
    <div className="survey-dynamic-block">
      <p className="survey-dynamic-title">{title}</p>
      <div className="survey-dynamic-list">
        {questions.map((question, index) => {
          const config = parseQuestionConfig(question.options);
          const answerKey = questionAnswerKey(question.text);
          const groupName = `survey-q-${question.id}`;
          const labelId = `${groupName}-label`;

          return (
            <div
              key={question.id}
              className="survey-question-field"
              role="group"
              aria-labelledby={labelId}
            >
              <div id={labelId} className="survey-question-legend">
                {(() => {
                  const { primary, secondary } = splitPipeText(question.text);
                  return (
                    <>
                      <div className="survey-question-heading">
                        <span className="survey-question-number">Q{index + 1}</span>
                        <span className="survey-question-primary">{primary}</span>
                      </div>
                      {secondary ? (
                        <span className="survey-question-secondary">{secondary}</span>
                      ) : null}
                    </>
                  );
                })()}
              </div>

              {config.type === "text" ? (
                <TextInputQuestion
                  groupName={groupName}
                  answerKey={answerKey}
                  fieldTemplates={config.fields}
                  answers={answers}
                  onChange={onChange}
                />
              ) : (
                <div
                  className="survey-question-options-grid"
                  role="radiogroup"
                  aria-label={question.text}
                >
                  {config.options.map((option) => {
                    const selected = answers[answerKey] === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        name={groupName}
                        aria-checked={selected}
                        role="radio"
                        onClick={() => onChange(answerKey, option)}
                        className={`survey-option-chip${selected ? " is-selected" : ""}`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
