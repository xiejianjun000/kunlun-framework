"use strict";
/**
 * @module determinism
 * @description WFGY防幻觉系统 - 符号层验证、自一致性检查、知识溯源和幻觉检测
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeterminismSystem = exports.HallucinationDetector = exports.SourceTracer = exports.SelfConsistencyChecker = exports.WFGYVerifier = void 0;
// 导出所有接口
__exportStar(require("./interfaces/IDeterminismSystem"), exports);
__exportStar(require("./interfaces/types"), exports);
// 导出所有实现类
var WFGYVerifier_1 = require("./WFGYVerifier");
Object.defineProperty(exports, "WFGYVerifier", { enumerable: true, get: function () { return WFGYVerifier_1.WFGYVerifier; } });
var SelfConsistencyChecker_1 = require("./SelfConsistencyChecker");
Object.defineProperty(exports, "SelfConsistencyChecker", { enumerable: true, get: function () { return SelfConsistencyChecker_1.SelfConsistencyChecker; } });
var SourceTracer_1 = require("./SourceTracer");
Object.defineProperty(exports, "SourceTracer", { enumerable: true, get: function () { return SourceTracer_1.SourceTracer; } });
var HallucinationDetector_1 = require("./HallucinationDetector");
Object.defineProperty(exports, "HallucinationDetector", { enumerable: true, get: function () { return HallucinationDetector_1.HallucinationDetector; } });
var DeterminismSystem_1 = require("./DeterminismSystem");
Object.defineProperty(exports, "DeterminismSystem", { enumerable: true, get: function () { return DeterminismSystem_1.DeterminismSystem; } });
