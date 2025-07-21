import * as yup from 'yup';
import { ValidationResult, ValidationError, ValidationNode, ValidationRule, DebugOptions } from '../types';

function isYupValidationError(err: any): err is yup.ValidationError {
  return (
    err &&
    typeof err === 'object' &&
    err.name === 'ValidationError' &&
    typeof err.message === 'string' &&
    Array.isArray(err.errors)
  );
}

function getSchemaTypeSafe(schema: any): string {
  // Try official property, then backup to constructor name
  if ('type' in schema) return schema.type;
  if ('_type' in schema) return schema._type;
  if (schema.constructor && typeof schema.constructor.name === 'string') {
    const cname = schema.constructor.name.toLowerCase();
    if (cname.includes('schema')) return cname.replace('schema', '');
    return cname;
  }
  return 'unknown';
}

export class YupDebugger {
  private schema: yup.Schema<any>;
  private options: DebugOptions;

  constructor(schema: yup.Schema<any>, options: DebugOptions = {}) {
    this.schema = schema;
    this.options = {
      includeValidFields: true,
      maxDepth: 10,
      abortEarly: false,
      ...options
    };
  }

  debug(values: any): ValidationResult {
    const errors: ValidationError[] = [];
    const fieldErrors: Record<string, ValidationError[]> = {};

    // Run validation to get errors
    try {
      this.schema.validateSync(values, { abortEarly: this.options.abortEarly });
    } catch (err) {
      // Duck-typed check, not instanceof!
      if (isYupValidationError(err)) {
        if (Array.isArray(err.inner) && err.inner.length > 0) {
          // Multiple errors
          err.inner.forEach(innerErr => {
            const validationError = this.createValidationError(innerErr);
            errors.push(validationError);

            const path = innerErr.path || 'root';
            if (!fieldErrors[path]) fieldErrors[path] = [];
            fieldErrors[path].push(validationError);
          });
        } else {
          // Single error
          const validationError = this.createValidationError(err);
          errors.push(validationError);

          const path = err.path || 'root';
          fieldErrors[path] = [validationError];
        }
      }
    }

    // Build validation tree
      const validationTree = this.options.makeValidationTree ? this.buildValidationTree(this.schema, values, '', errors): undefined;
    return {
      isValid: errors.length === 0,
      errors,
      fieldErrors,
      validationTree
    };
  }

  private createValidationError(err: any): ValidationError {
    return {
      path: err.path || 'root',
      message: err.message,
      value: err.value,
      type: err.type || 'unknown',
      params: err.params
    };
  }

  private buildValidationTree(
    schema: yup.Schema<any>,
    values: any,
    path: string,
    errors: ValidationError[],
    depth: number = 0
  ): ValidationNode {
    if (depth > (this.options.maxDepth || 10)) {
      return {
        path,
        type: 'max-depth-reached',
        isValid: true,
        value: values,
        children: [],
        rules: []
      };
    }

    const currentError = errors.find(err => err.path === path);
    const isValid = !currentError;
    const children: ValidationNode[] = [];

    // Handle object schemas duck-typed for compatibility
    if (
      ('fields' in schema && typeof schema.fields === 'object') ||
      ('_nodes' in schema && Array.isArray(schema._nodes))
    ) {
      const fields =
        (schema as any).fields ||
        ((schema as any)._nodes || []).reduce((acc: any, node: string) => {
          acc[node] = (schema as any).shape?.[node];
          return acc;
        }, {});
      Object.keys(fields).forEach(fieldName => {
        const fieldPath = path ? `${path}.${fieldName}` : fieldName;
        const fieldSchema = fields[fieldName];
        const fieldValue = values && typeof values === 'object' ? values[fieldName] : undefined;
        if (fieldSchema && typeof fieldSchema === 'object' && typeof fieldSchema.validateSync === 'function') {
          const childNode = this.buildValidationTree(
            fieldSchema as yup.Schema<any>,
            fieldValue,
            fieldPath,
            errors,
            depth + 1
          );
          children.push(childNode);
        }
      });
    }

    // Handle array schemas
    if (
      ('innerType' in schema && schema.innerType) ||
      ('_subType' in schema && schema._subType)
    ) {
      const itemSchema =
        (schema as any).innerType ||
        (schema as any)._subType;
      if (Array.isArray(values)) {
        values.forEach((item, index) => {
          const itemPath = `${path}[${index}]`;
          if (itemSchema && typeof itemSchema === 'object' && typeof itemSchema.validateSync === 'function') {
            const childNode = this.buildValidationTree(
              itemSchema as yup.Schema<any>,
              item,
              itemPath,
              errors,
              depth + 1
            );
            children.push(childNode);
          }
        });
      }
    }

    // Extract validation rules from schema
    const rules = this.extractValidationRules(schema, values, currentError);

    return {
      path,
      type: getSchemaTypeSafe(schema),
      isValid,
      value: values,
      error: currentError,
      children,
      rules
    };
  }

  private extractValidationRules(schema: yup.Schema<any>, value: any, error?: ValidationError): ValidationRule[] {
    const rules: ValidationRule[] = [];
    const tests = (schema as any).tests || (schema as any)._tests || [];

    tests.forEach((test: any) => {
      const rule: ValidationRule = {
        type: test.OPTIONS?.name || test.name || 'unknown',
        params: test.OPTIONS?.params || test.params,
        message: test.OPTIONS?.message || test.message,
        isValid: true // We'll determine this based on the error
      };

      // If there's an error and it matches this rule type, mark as invalid
      if (error && error.type === rule.type) {
        rule.isValid = false;
      }

      rules.push(rule);
    });

    // Add basic type validation
    rules.unshift({
      type: 'type',
      isValid: error?.type !== 'typeError'
    });

    return rules;
  }
}

// Convenience function
export function debugYupSchema(schema: yup.Schema<any>, values: any, options?: DebugOptions): ValidationResult {
  const debuggerInstance = new YupDebugger(schema, options);
  return debuggerInstance.debug(values);
}
