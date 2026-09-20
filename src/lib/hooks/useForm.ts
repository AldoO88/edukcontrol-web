// Hook personalizado para formularios
// Wrapper sobre react-hook-form con validación Zod

"use client";

import { useForm as useReactHookForm, type UseFormReturn, type FieldValues, type DefaultValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type ZodSchema } from "zod";

interface UseFormOptions<T extends FieldValues> {
  schema: ZodSchema<T>;
  defaultValues?: DefaultValues<T>;
  onSubmit?: (data: T) => Promise<void> | void;
}

interface UseFormReturnExtended<T extends FieldValues> extends UseFormReturn<T> {
  isSubmitting: boolean;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
}

export function useForm<T extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
}: UseFormOptions<T>): UseFormReturnExtended<T> {
  const form = useReactHookForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const handleSubmit = form.handleSubmit(async (data: T) => {
    if (onSubmit) {
      await onSubmit(data);
    }
  });

  return {
    ...form,
    isSubmitting: form.formState.isSubmitting,
    onSubmit: handleSubmit,
  };
}
