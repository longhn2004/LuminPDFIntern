import React from "react";

interface AuthCheckboxProps {
  id: string;
  checked: boolean;
  onChange: () => void;
  label: React.ReactNode;
  error?: string;
}

export default function AuthCheckbox({ id, checked, onChange, label, error }: AuthCheckboxProps) {
  return (
    <div className="flex flex-col w-full mb-2">
      <div className="flex items-center w-full">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={onChange}
          className="mr-2"
      />
      <label htmlFor={id} className="text-sm select-none">
          {label}
        </label>
      </div>
      {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
    </div>
  );
} 