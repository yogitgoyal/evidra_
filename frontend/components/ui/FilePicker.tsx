"use client";

import { ChangeEvent } from "react";

interface FilePickerProps {
  id: string;
  accept: string;
  file: File | null;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function FilePicker({ id, accept, file, onChange }: FilePickerProps) {
  return (
    <div className="min-w-0 space-y-2">
      <label
        htmlFor={id}
        className="inline-flex cursor-pointer rounded-lg bg-cyan px-4 py-2 text-sm font-medium text-black focus-within:outline-none focus-within:ring-2 focus-within:ring-cyan/50"
      >
        Choose a file
      </label>
      <input
        id={id}
        type="file"
        accept={accept}
        onChange={onChange}
        className="sr-only"
      />
      {file && (
        <p
          className="max-w-full truncate text-sm text-text-faint"
          title={file.name}
        >
          {file.name}
        </p>
      )}
    </div>
  );
}
