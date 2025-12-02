import { Injectable } from '@angular/core';
import { AppConfig } from '@excel-platform/shared/types';

/**
 * Validation result with success flag and error messages.
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Array of validation error messages (empty if valid) */
  errors: string[];
}

/**
 * Config Validator Service - Validates AppConfig structure.
 *
 * Ensures config has required fields and correct structure before use.
 * Called during config loading to catch malformed configs early.
 */
@Injectable({ providedIn: 'root' })
export class ConfigValidatorService {
  /**
   * Validate entire AppConfig structure.
   *
   * Checks required fields, API catalog structure, text catalog structure.
   *
   * @param config - AppConfig to validate
   * @returns ValidationResult with errors array
   */
  validate(config: AppConfig): ValidationResult {
    const errors: string[] = [];

    // Validate required top-level fields
    if (!config.defaultViewId) {
      errors.push('Config missing required field: defaultViewId');
    }

    if (!config.navItems || !Array.isArray(config.navItems)) {
      errors.push('Config missing or invalid field: navItems (must be array)');
    } else if (config.navItems.length === 0) {
      errors.push('Config navItems array is empty');
    }

    if (!config.roles || !Array.isArray(config.roles)) {
      errors.push('Config missing or invalid field: roles (must be array)');
    }

    if (!config.rootIdsAndClasses) {
      errors.push('Config missing required field: rootIdsAndClasses');
    }

    // Validate navItems structure
    if (config.navItems && Array.isArray(config.navItems)) {
      config.navItems.forEach((item, index) => {
        if (!item.id) {
          errors.push(`navItems[${index}] missing required field: id`);
        }
        if (!item.labelKey) {
          errors.push(`navItems[${index}] missing required field: labelKey`);
        }
        if (!item.actionType) {
          errors.push(`navItems[${index}] missing required field: actionType`);
        }
      });
    }

    // Validate apiCatalog if present
    if (config.apiCatalog !== undefined) {
      if (!Array.isArray(config.apiCatalog)) {
        errors.push('Config apiCatalog must be an array');
      } else {
        config.apiCatalog.forEach((api, index) => {
          if (!api.id) {
            errors.push(`apiCatalog[${index}] missing required field: id`);
          }
          if (!api.name) {
            errors.push(`apiCatalog[${index}] missing required field: name`);
          }
          if (!api.parameters || !Array.isArray(api.parameters)) {
            errors.push(`apiCatalog[${index}] missing or invalid field: parameters (must be array)`);
          }
        });
      }
    }

    // Validate text catalog if present
    if (config.text !== undefined) {
      if (typeof config.text !== 'object' || config.text === null) {
        errors.push('Config text must be an object');
      } else {
        // Check required text sections
        const requiredSections = ['nav', 'auth', 'query', 'worksheet', 'table', 'user', 'ui'];
        requiredSections.forEach(section => {
          if (!(section in config.text!)) {
            errors.push(`Config text missing required section: ${section}`);
          }
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate and throw if invalid.
   *
   * Convenience method for fail-fast validation during config loading.
   *
   * @param config - AppConfig to validate
   * @throws Error with validation errors if invalid
   */
  validateOrThrow(config: AppConfig): void {
    const result = this.validate(config);
    if (!result.valid) {
      throw new Error(`Config validation failed:\n${result.errors.join('\n')}`);
    }
  }
}
