export interface ValidationError {
  path: string;
  message: string;
  value: any;
  type: string;
  params?: Record<string, any>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  fieldErrors: Record<string, ValidationError[]>;
  validationTree: ValidationNode;
}

export interface ValidationNode {
  path: string;
  type: string;
  isValid: boolean;
  value: any;
  error?: ValidationError;
  children: ValidationNode[];
  rules: ValidationRule[];
}

export interface ValidationRule {
  type: string;
  params?: Record<string, any>;
  message?: string;
  isValid: boolean;
}

export interface DebugOptions {
  includeValidFields?: boolean;
  maxDepth?: number;
  abortEarly?: boolean;
}