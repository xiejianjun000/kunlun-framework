"use strict";
/**
 * @module adapters/llm
 * @description 国产大模型适配器集合
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
exports.SparkDefaultPricing = exports.SparkAdapter = exports.KimiDefaultPricing = exports.KimiAdapter = exports.GLMDefaultPricing = exports.GLMAdapter = exports.DoubaoDefaultPricing = exports.DoubaoAdapter = exports.HunyuanDefaultPricing = exports.HunyuanAdapter = exports.WenxinDefaultPricing = exports.WenxinAdapter = exports.QwenDefaultPricing = exports.QwenAdapter = exports.BaseLLMAdapter = void 0;
// 导出接口
__exportStar(require("./interfaces/ILLMAdapter"), exports);
// 导出基类
var BaseLLMAdapter_1 = require("./BaseLLMAdapter");
Object.defineProperty(exports, "BaseLLMAdapter", { enumerable: true, get: function () { return BaseLLMAdapter_1.BaseLLMAdapter; } });
// 导出各个适配器
var QwenAdapter_1 = require("./QwenAdapter");
Object.defineProperty(exports, "QwenAdapter", { enumerable: true, get: function () { return QwenAdapter_1.QwenAdapter; } });
Object.defineProperty(exports, "QwenDefaultPricing", { enumerable: true, get: function () { return QwenAdapter_1.QwenDefaultPricing; } });
var WenxinAdapter_1 = require("./WenxinAdapter");
Object.defineProperty(exports, "WenxinAdapter", { enumerable: true, get: function () { return WenxinAdapter_1.WenxinAdapter; } });
Object.defineProperty(exports, "WenxinDefaultPricing", { enumerable: true, get: function () { return WenxinAdapter_1.WenxinDefaultPricing; } });
var HunyuanAdapter_1 = require("./HunyuanAdapter");
Object.defineProperty(exports, "HunyuanAdapter", { enumerable: true, get: function () { return HunyuanAdapter_1.HunyuanAdapter; } });
Object.defineProperty(exports, "HunyuanDefaultPricing", { enumerable: true, get: function () { return HunyuanAdapter_1.HunyuanDefaultPricing; } });
var DoubaoAdapter_1 = require("./DoubaoAdapter");
Object.defineProperty(exports, "DoubaoAdapter", { enumerable: true, get: function () { return DoubaoAdapter_1.DoubaoAdapter; } });
Object.defineProperty(exports, "DoubaoDefaultPricing", { enumerable: true, get: function () { return DoubaoAdapter_1.DoubaoDefaultPricing; } });
var GLMAdapter_1 = require("./GLMAdapter");
Object.defineProperty(exports, "GLMAdapter", { enumerable: true, get: function () { return GLMAdapter_1.GLMAdapter; } });
Object.defineProperty(exports, "GLMDefaultPricing", { enumerable: true, get: function () { return GLMAdapter_1.GLMDefaultPricing; } });
var KimiAdapter_1 = require("./KimiAdapter");
Object.defineProperty(exports, "KimiAdapter", { enumerable: true, get: function () { return KimiAdapter_1.KimiAdapter; } });
Object.defineProperty(exports, "KimiDefaultPricing", { enumerable: true, get: function () { return KimiAdapter_1.KimiDefaultPricing; } });
var SparkAdapter_1 = require("./SparkAdapter");
Object.defineProperty(exports, "SparkAdapter", { enumerable: true, get: function () { return SparkAdapter_1.SparkAdapter; } });
Object.defineProperty(exports, "SparkDefaultPricing", { enumerable: true, get: function () { return SparkAdapter_1.SparkDefaultPricing; } });
