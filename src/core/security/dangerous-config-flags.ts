// @ts-nocheck — OpenCLAW原版参考文件，不需要类型检查
// Ported from openclaw/src/security/dangerous-config-flags.ts
// Dangerous config flag detection for security audit

/**
 * OpenTaiji config shape (simplified mirror of OpenClawConfig)
 */
export interface OpenTaijiConfig {
  gateway?: {
    controlUi?: {
      allowInsecureAuth?: boolean;
      dangerouslyAllowHostHeaderOriginFallback?: boolean;
      dangerouslyDisableDeviceAuth?: boolean;
    };
  };
  hooks?: {
    gmail?: {
      allowUnsafeExternalContent?: boolean;
    };
    mappings?: Array<{
      allowUnsafeExternalContent?: boolean;
    }>;
  };
  tools?: {
    exec?: {
      applyPatch?: {
        workspaceOnly?: boolean;
      };
    };
  };
  plugins?: {
    entries?: Record<string, {
      config?: Record<string, unknown>;
    }>;
  };
}

/**
 * Collects all dangerous/insecure flag values currently enabled in config.
 * Used by security audit to flag risky settings.
 */
export function collectEnabledInsecureOrDangerousFlags(
  cfg: OpenTaijiConfig
): string[] {
  const enabledFlags: string[] = [];

  if (cfg.gateway?.controlUi?.allowInsecureAuth === true) {
    enabledFlags.push("gateway.controlUi.allowInsecureAuth=true");
  }
  if (cfg.gateway?.controlUi?.dangerouslyAllowHostHeaderOriginFallback === true) {
    enabledFlags.push("gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true");
  }
  if (cfg.gateway?.controlUi?.dangerouslyDisableDeviceAuth === true) {
    enabledFlags.push("gateway.controlUi.dangerouslyDisableDeviceAuth=true");
  }
  if (cfg.hooks?.gmail?.allowUnsafeExternalContent === true) {
    enabledFlags.push("hooks.gmail.allowUnsafeExternalContent=true");
  }
  if (Array.isArray(cfg.hooks?.mappings)) {
    for (const [index, mapping] of cfg.hooks.mappings.entries()) {
      if (mapping?.allowUnsafeExternalContent === true) {
        enabledFlags.push(`hooks.mappings[${index}].allowUnsafeExternalContent=true`);
      }
    }
  }
  if (cfg.tools?.exec?.applyPatch?.workspaceOnly === false) {
    enabledFlags.push("tools.exec.applyPatch.workspaceOnly=false");
  }

  return enabledFlags;
}
