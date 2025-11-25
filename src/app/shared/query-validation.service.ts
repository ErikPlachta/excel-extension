import { Injectable } from '@angular/core';
import { ApiDefinition, ApiParameter } from '../types/api.types';
import { QueryConfiguration } from '../types';
import { QueryConfigurationItem } from '../features/queries/queries.component';
import { ApiCatalogService } from './api-catalog.service';

/**
 * Query Validation Service - Validate query configurations and parameters.
 *
 * Centralizes validation logic for QueryConfiguration and QueryConfigurationItem
 * to ensure consistency across the application. Provides detailed error messages
 * for debugging and user feedback.
 *
 * **Usage:**
 * ```typescript
 * const result = validator.validateConfiguration(config);
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 *   throw new Error(result.errors.join(', '));
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class QueryValidationService {
  constructor(private readonly apiCatalog: ApiCatalogService) {}

  /**
   * Validate QueryConfiguration and all its items.
   *
   * Checks:
   * - All items reference valid apiIds in catalog
   * - Each item's parameters satisfy API requirements
   * - Required parameters are present
   *
   * @param config - Query configuration to validate
   * @returns Validation result with detailed errors
   */
  validateConfiguration(config: QueryConfiguration): ValidationResult {
    const errors: string[] = [];

    // Validate basic structure
    if (!config.id) {
      errors.push('Configuration missing required field: id');
    }
    if (!config.name) {
      errors.push('Configuration missing required field: name');
    }

    // Validate items
    if (!config.items || config.items.length === 0) {
      errors.push('Configuration must have at least one item');
    } else {
      for (const item of config.items) {
        const itemResult = this.validateConfigurationItem(
          item,
          config.parameterPresets?.perQuery[item.id]
        );
        if (!itemResult.valid) {
          errors.push(...itemResult.errors.map((e) => `Item ${item.id}: ${e}`));
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate single QueryConfigurationItem against API catalog.
   *
   * Checks:
   * - apiId exists in catalog
   * - Required parameters are present (if parameterValues provided)
   * - Parameter types match expectations (basic type checking)
   *
   * @param item - Configuration item to validate
   * @param parameterValues - Optional parameter values to validate
   * @returns Validation result with detailed errors
   */
  validateConfigurationItem(
    item: QueryConfigurationItem,
    parameterValues?: Record<string, any>
  ): ValidationResult {
    const errors: string[] = [];

    // Validate item structure
    if (!item.id) {
      errors.push('Item missing required field: id');
    }
    if (!item.apiId) {
      errors.push('Item missing required field: apiId');
    }

    // Validate apiId exists in catalog
    const api = this.apiCatalog.getApiById(item.apiId);
    if (!api) {
      errors.push(`API not found in catalog: ${item.apiId}`);
      return { valid: false, errors }; // Early return - can't validate parameters without API def
    }

    // Validate parameters if provided
    if (parameterValues && api.parameters) {
      const paramResult = this.validateParameters(api, parameterValues);
      if (!paramResult.valid) {
        errors.push(...paramResult.errors);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate parameter values against API definition.
   *
   * Checks:
   * - All required parameters are present
   * - Parameter types match expectations (date, number, string, boolean)
   *
   * @param api - API definition with parameter requirements
   * @param parameterValues - Parameter values to validate
   * @returns Validation result with detailed errors
   */
  validateParameters(
    api: ApiDefinition,
    parameterValues: Record<string, any>
  ): ValidationResult {
    const errors: string[] = [];

    // Check required parameters
    for (const param of api.parameters) {
      if (param.required) {
        const value = parameterValues[param.key];
        if (value === undefined || value === null || value === '') {
          errors.push(`Missing required parameter: ${param.key} (${param.label || param.key})`);
        }
      }
    }

    // Validate parameter types
    for (const param of api.parameters) {
      const value = parameterValues[param.key];
      if (value !== undefined && value !== null && value !== '') {
        const typeResult = this.validateParameterType(param, value);
        if (!typeResult.valid) {
          errors.push(...typeResult.errors);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate single parameter value type.
   *
   * Performs basic type checking based on parameter definition.
   * Lenient validation to handle string representations of numbers/dates.
   *
   * @param param - Parameter definition
   * @param value - Parameter value to validate
   * @returns Validation result
   */
  private validateParameterType(param: ApiParameter, value: any): ValidationResult {
    const errors: string[] = [];

    switch (param.type) {
      case 'number':
        if (typeof value !== 'number' && isNaN(Number(value))) {
          errors.push(
            `Parameter ${param.key} must be a number, got: ${typeof value} (${value})`
          );
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
          errors.push(
            `Parameter ${param.key} must be a boolean, got: ${typeof value} (${value})`
          );
        }
        break;

      case 'date':
        // Accept Date objects, ISO strings, or valid date strings
        if (!(value instanceof Date) && isNaN(Date.parse(value))) {
          errors.push(
            `Parameter ${param.key} must be a valid date, got: ${typeof value} (${value})`
          );
        }
        break;

      case 'string':
        // Always valid - any value can be stringified
        break;

      default:
        // Unknown type - skip validation
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate that an apiId exists in the catalog.
   *
   * Convenience method for quick apiId checks without full item validation.
   *
   * @param apiId - API identifier to validate
   * @returns true if API exists in catalog
   */
  apiExists(apiId: string): boolean {
    return this.apiCatalog.getApiById(apiId) !== undefined;
  }
}

/**
 * Validation result with success flag and detailed errors.
 */
export interface ValidationResult {
  /** true if validation passed, false otherwise */
  valid: boolean;
  /** Array of error messages (empty if valid) */
  errors: string[];
}
