"use client";

/** The report prints to PDF from the browser (@page A4), like the one-page report. */
export function PrintButton() {
  return (
    <button type="button" className="btn btn-main btn-s" onClick={() => window.print()}>
      列印／另存 PDF
    </button>
  );
}
