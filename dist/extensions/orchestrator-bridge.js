var __defProp = Object.defineProperty;
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};

// extensions/orchestrator-bridge.ts
import * as fs from "node:fs";
import * as os from "node:os";
import * as path2 from "node:path";
import { fileURLToPath } from "node:url";
import { createConnection } from "node:net";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";

// node_modules/typebox/build/system/memory/memory.mjs
var exports_memory = {};
__export(exports_memory, {
  Update: () => Update,
  Metrics: () => Metrics,
  Discard: () => Discard,
  Create: () => Create,
  Clone: () => Clone,
  Assign: () => Assign
});

// node_modules/typebox/build/system/memory/metrics.mjs
var Metrics = {
  assign: 0,
  create: 0,
  clone: 0,
  discard: 0,
  update: 0
};

// node_modules/typebox/build/system/memory/assign.mjs
function Assign(left, right) {
  Metrics.assign += 1;
  return { ...left, ...right };
}
// node_modules/typebox/build/guard/guard.mjs
var exports_guard = {};
__export(exports_guard, {
  Values: () => Values,
  TakeLeft: () => TakeLeft,
  Symbols: () => Symbols,
  Keys: () => Keys,
  IsValueLike: () => IsValueLike,
  IsUnsafePropertyKey: () => IsUnsafePropertyKey,
  IsUndefined: () => IsUndefined,
  IsSymbol: () => IsSymbol,
  IsString: () => IsString,
  IsObjectNotArray: () => IsObjectNotArray,
  IsObject: () => IsObject,
  IsNumber: () => IsNumber,
  IsNull: () => IsNull,
  IsMultipleOf: () => IsMultipleOf,
  IsMinLength: () => IsMinLength2,
  IsMaxLength: () => IsMaxLength2,
  IsLessThan: () => IsLessThan,
  IsLessEqualThan: () => IsLessEqualThan,
  IsIterator: () => IsIterator,
  IsInteger: () => IsInteger,
  IsGreaterThan: () => IsGreaterThan,
  IsGreaterEqualThan: () => IsGreaterEqualThan,
  IsFunction: () => IsFunction,
  IsEqual: () => IsEqual,
  IsDeepEqual: () => IsDeepEqual,
  IsConstructor: () => IsConstructor,
  IsClassInstance: () => IsClassInstance,
  IsBoolean: () => IsBoolean,
  IsBigInt: () => IsBigInt,
  IsAsyncIterator: () => IsAsyncIterator,
  IsArray: () => IsArray,
  HasPropertyKey: () => HasPropertyKey,
  GraphemeCount: () => GraphemeCount2,
  EveryAll: () => EveryAll,
  Every: () => Every,
  EntriesRegExp: () => EntriesRegExp,
  Entries: () => Entries
});

// node_modules/typebox/build/guard/string.mjs
function IsBetween(value, min, max) {
  return value >= min && value <= max;
}
function IsRegionalIndicator(value) {
  return IsBetween(value, 127462, 127487);
}
function IsVariationSelector(value) {
  return IsBetween(value, 65024, 65039);
}
function IsCombiningMark(value) {
  return IsBetween(value, 768, 879) || IsBetween(value, 6832, 6911) || IsBetween(value, 7616, 7679) || IsBetween(value, 65056, 65071);
}
function CodePointLength(value) {
  return value > 65535 ? 2 : 1;
}
function ConsumeModifiers(value, index) {
  while (index < value.length) {
    const point = value.codePointAt(index);
    if (IsCombiningMark(point) || IsVariationSelector(point)) {
      index += CodePointLength(point);
    } else {
      break;
    }
  }
  return index;
}
function NextGraphemeClusterIndex(value, clusterStart) {
  const startCP = value.codePointAt(clusterStart);
  let clusterEnd = clusterStart + CodePointLength(startCP);
  clusterEnd = ConsumeModifiers(value, clusterEnd);
  while (clusterEnd < value.length - 1 && value[clusterEnd] === "‍") {
    const nextCP = value.codePointAt(clusterEnd + 1);
    clusterEnd += 1 + CodePointLength(nextCP);
    clusterEnd = ConsumeModifiers(value, clusterEnd);
  }
  if (IsRegionalIndicator(startCP) && clusterEnd < value.length && IsRegionalIndicator(value.codePointAt(clusterEnd))) {
    clusterEnd += CodePointLength(value.codePointAt(clusterEnd));
  }
  return clusterEnd;
}
function IsGraphemeCodePoint(value) {
  return IsBetween(value, 55296, 56319) || IsBetween(value, 768, 879) || value === 8205;
}
function GraphemeCount(value) {
  let count = 0;
  let index = 0;
  while (index < value.length) {
    index = NextGraphemeClusterIndex(value, index);
    count++;
  }
  return count;
}
function IsMinLength(value, minLength) {
  if (minLength === 0)
    return true;
  let count = 0;
  let index = 0;
  while (index < value.length) {
    index = NextGraphemeClusterIndex(value, index);
    count++;
    if (count >= minLength)
      return true;
  }
  return false;
}
function IsMaxLength(value, maxLength) {
  let count = 0;
  let index = 0;
  while (index < value.length) {
    index = NextGraphemeClusterIndex(value, index);
    count++;
    if (count > maxLength)
      return false;
  }
  return true;
}
function IsMinLengthFast(value, minLength) {
  if (minLength === 0)
    return true;
  let index = 0;
  while (index < value.length) {
    if (IsGraphemeCodePoint(value.charCodeAt(index))) {
      return IsMinLength(value, minLength);
    }
    index++;
    if (index >= minLength)
      return true;
  }
  return false;
}
function IsMaxLengthFast(value, maxLength) {
  let index = 0;
  while (index < value.length) {
    if (IsGraphemeCodePoint(value.charCodeAt(index))) {
      return IsMaxLength(value, maxLength);
    }
    index++;
    if (index > maxLength)
      return false;
  }
  return true;
}

// node_modules/typebox/build/guard/guard.mjs
function IsArray(value) {
  return Array.isArray(value);
}
function IsAsyncIterator(value) {
  return IsObject(value) && Symbol.asyncIterator in value;
}
function IsBigInt(value) {
  return IsEqual(typeof value, "bigint");
}
function IsBoolean(value) {
  return IsEqual(typeof value, "boolean");
}
function IsConstructor(value) {
  if (IsUndefined(value) || !IsFunction(value))
    return false;
  const result = Function.prototype.toString.call(value);
  if (/^class\s/.test(result))
    return true;
  if (/\[native code\]/.test(result))
    return true;
  return false;
}
function IsFunction(value) {
  return IsEqual(typeof value, "function");
}
function IsInteger(value) {
  return Number.isInteger(value);
}
function IsIterator(value) {
  return IsObject(value) && Symbol.iterator in value;
}
function IsNull(value) {
  return IsEqual(value, null);
}
function IsNumber(value) {
  return Number.isFinite(value);
}
function IsObjectNotArray(value) {
  return IsObject(value) && !IsArray(value);
}
function IsObject(value) {
  return IsEqual(typeof value, "object") && !IsNull(value);
}
function IsString(value) {
  return IsEqual(typeof value, "string");
}
function IsSymbol(value) {
  return IsEqual(typeof value, "symbol");
}
function IsUndefined(value) {
  return IsEqual(value, undefined);
}
function IsEqual(left, right) {
  return left === right;
}
function IsGreaterThan(left, right) {
  return left > right;
}
function IsLessThan(left, right) {
  return left < right;
}
function IsLessEqualThan(left, right) {
  return left <= right;
}
function IsGreaterEqualThan(left, right) {
  return left >= right;
}
function IsMultipleOf(dividend, divisor) {
  if (IsBigInt(dividend) || IsBigInt(divisor)) {
    return BigInt(dividend) % BigInt(divisor) === 0n;
  }
  const tolerance = 0.0000000001;
  if (!IsNumber(dividend))
    return true;
  if (IsInteger(dividend) && 1 / divisor % 1 === 0)
    return true;
  const mod = dividend % divisor;
  return Math.min(Math.abs(mod), Math.abs(mod - divisor)) < tolerance;
}
function IsClassInstance(value) {
  if (!IsObject(value))
    return false;
  const proto = globalThis.Object.getPrototypeOf(value);
  if (IsNull(proto))
    return false;
  return IsEqual(typeof proto.constructor, "function") && !(IsEqual(proto.constructor, globalThis.Object) || IsEqual(proto.constructor.name, "Object"));
}
function IsValueLike(value) {
  return IsBigInt(value) || IsBoolean(value) || IsNull(value) || IsNumber(value) || IsString(value) || IsUndefined(value);
}
function GraphemeCount2(value) {
  return GraphemeCount(value);
}
function IsMaxLength2(value, length) {
  return IsMaxLengthFast(value, length);
}
function IsMinLength2(value, length) {
  return IsMinLengthFast(value, length);
}
function Every(value, offset, callback) {
  for (let index = offset;index < value.length; index++) {
    if (!callback(value[index], index))
      return false;
  }
  return true;
}
function EveryAll(value, offset, callback) {
  let result = true;
  for (let index = offset;index < value.length; index++) {
    if (!callback(value[index], index))
      result = false;
  }
  return result;
}
function TakeLeft(array, true_, false_) {
  return IsEqual(array.length, 0) ? false_() : true_(array[0], array.slice(1));
}
function IsUnsafePropertyKey(key) {
  return IsEqual(key, "__proto__") || IsEqual(key, "constructor") || IsEqual(key, "prototype");
}
function HasPropertyKey(value, key) {
  return IsUnsafePropertyKey(key) ? Object.prototype.hasOwnProperty.call(value, key) : (key in value);
}
function EntriesRegExp(value) {
  return Keys(value).map((key) => [new RegExp(`^${key}$`), value[key]]);
}
function Entries(value) {
  return Object.entries(value);
}
function Keys(value) {
  return Object.getOwnPropertyNames(value);
}
function Symbols(value) {
  return Object.getOwnPropertySymbols(value);
}
function Values(value) {
  return Object.values(value);
}
function DeepEqualObject(left, right) {
  if (!IsObject(right))
    return false;
  const keys = Keys(left);
  return IsEqual(keys.length, Keys(right).length) && keys.every((key) => IsDeepEqual(left[key], right[key]));
}
function DeepEqualArray(left, right) {
  return IsArray(right) && IsEqual(left.length, right.length) && left.every((_, index) => IsDeepEqual(left[index], right[index]));
}
function IsDeepEqual(left, right) {
  return IsArray(left) ? DeepEqualArray(left, right) : IsObject(left) ? DeepEqualObject(left, right) : IsEqual(left, right);
}
// node_modules/typebox/build/system/memory/clone.mjs
function IsGuard(value) {
  return exports_guard.IsObject(value) && exports_guard.HasPropertyKey(value, "~guard");
}
function FromGuard(value) {
  return value;
}
function FromArray(value) {
  return value.map((value2) => FromValue(value2));
}
function FromObject(value) {
  const result = {};
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of Object.keys(descriptors)) {
    const descriptor = descriptors[key];
    if (exports_guard.HasPropertyKey(descriptor, "value")) {
      Object.defineProperty(result, key, { ...descriptor, value: FromValue(descriptor.value) });
    }
  }
  return result;
}
function FromRegExp(value) {
  return new RegExp(value.source, value.flags);
}
function FromUnknown(value) {
  return value;
}
function FromValue(value) {
  return value instanceof RegExp ? FromRegExp(value) : IsGuard(value) ? FromGuard(value) : exports_guard.IsArray(value) ? FromArray(value) : exports_guard.IsObject(value) ? FromObject(value) : FromUnknown(value);
}
function Clone(value) {
  Metrics.clone += 1;
  return FromValue(value);
}
// node_modules/typebox/build/system/settings/settings.mjs
var exports_settings = {};
__export(exports_settings, {
  Set: () => Set2,
  Reset: () => Reset,
  Get: () => Get
});
var settings = {
  immutableTypes: false,
  maxErrors: 8,
  useAcceleration: true,
  exactOptionalPropertyTypes: false,
  enumerableKind: false,
  correctiveParse: false
};
function Reset() {
  settings.immutableTypes = false;
  settings.maxErrors = 8;
  settings.useAcceleration = true;
  settings.exactOptionalPropertyTypes = false;
  settings.enumerableKind = false;
  settings.correctiveParse = false;
}
function Set2(options) {
  for (const key of exports_guard.Keys(options)) {
    const value = options[key];
    if (value !== undefined) {
      Object.defineProperty(settings, key, { value });
    }
  }
}
function Get() {
  return settings;
}
// node_modules/typebox/build/system/memory/create.mjs
function MergeHidden(left, right) {
  for (const key of Object.keys(right)) {
    Object.defineProperty(left, key, {
      configurable: true,
      writable: true,
      enumerable: false,
      value: right[key]
    });
  }
  return left;
}
function Merge(left, right) {
  return { ...left, ...right };
}
function Create(hidden, enumerable, options = {}) {
  Metrics.create += 1;
  const settings2 = exports_settings.Get();
  const withOptions = Merge(enumerable, options);
  const withHidden = settings2.enumerableKind ? Merge(withOptions, hidden) : MergeHidden(withOptions, hidden);
  return settings2.immutableTypes ? Object.freeze(withHidden) : withHidden;
}
// node_modules/typebox/build/system/memory/discard.mjs
function Discard(value, propertyKeys) {
  Metrics.discard += 1;
  const result = {};
  const descriptors = Object.getOwnPropertyDescriptors(Clone(value));
  const keysToDiscard = new Set(propertyKeys);
  for (const key of Object.keys(descriptors)) {
    if (keysToDiscard.has(key))
      continue;
    Object.defineProperty(result, key, descriptors[key]);
  }
  return result;
}
// node_modules/typebox/build/system/memory/update.mjs
function Update(current, hidden, enumerable) {
  Metrics.update += 1;
  const settings2 = exports_settings.Get();
  const result = Clone(current);
  for (const key of Object.keys(hidden)) {
    Object.defineProperty(result, key, {
      configurable: true,
      writable: true,
      enumerable: settings2.enumerableKind,
      value: hidden[key]
    });
  }
  for (const key of Object.keys(enumerable)) {
    Object.defineProperty(result, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: enumerable[key]
    });
  }
  return result;
}
// node_modules/typebox/build/type/types/schema.mjs
function IsKind(value, kind) {
  return exports_guard.IsObject(value) && exports_guard.HasPropertyKey(value, "~kind") && exports_guard.IsEqual(value["~kind"], kind);
}
function IsSchema(value) {
  return exports_guard.IsObject(value);
}

// node_modules/typebox/build/type/action/_optional.mjs
function OptionalAddAction(type) {
  return exports_memory.Create({ ["~kind"]: "OptionalAddAction" }, { type }, {});
}
function IsOptionalAddAction(value) {
  return exports_guard.IsObject(value) && exports_guard.HasPropertyKey(value, "~kind") && exports_guard.HasPropertyKey(value, "type") && exports_guard.IsEqual(value["~kind"], "OptionalAddAction") && IsSchema(value.type);
}
function OptionalRemoveAction(type) {
  return exports_memory.Create({ ["~kind"]: "OptionalRemoveAction" }, { type }, {});
}
function IsOptionalRemoveAction(value) {
  return exports_guard.IsObject(value) && exports_guard.HasPropertyKey(value, "~kind") && exports_guard.HasPropertyKey(value, "type") && exports_guard.IsEqual(value["~kind"], "OptionalRemoveAction") && IsSchema(value.type);
}
// node_modules/typebox/build/type/action/_readonly.mjs
function ReadonlyAddAction(type) {
  return exports_memory.Create({ ["~kind"]: "ReadonlyAddAction" }, { type }, {});
}
function IsReadonlyAddAction(value) {
  return exports_guard.IsObject(value) && exports_guard.HasPropertyKey(value, "~kind") && exports_guard.HasPropertyKey(value, "type") && exports_guard.IsEqual(value["~kind"], "ReadonlyAddAction") && IsSchema(value.type);
}
function ReadonlyRemoveAction(type) {
  return exports_memory.Create({ ["~kind"]: "ReadonlyRemoveAction" }, { type }, {});
}
function IsReadonlyRemoveAction(value) {
  return exports_guard.IsObject(value) && exports_guard.HasPropertyKey(value, "~kind") && exports_guard.HasPropertyKey(value, "type") && exports_guard.IsEqual(value["~kind"], "ReadonlyRemoveAction") && IsSchema(value.type);
}
// node_modules/typebox/build/type/types/deferred.mjs
function Deferred(action, parameters, options) {
  return exports_memory.Create({ "~kind": "Deferred" }, { action, parameters, options }, {});
}
function IsDeferred(value) {
  return IsKind(value, "Deferred");
}

// node_modules/typebox/build/type/types/promise.mjs
function _Promise_(item, options) {
  return exports_memory.Create({ ["~kind"]: "Promise" }, { type: "promise", item }, options);
}
function IsPromise(value) {
  return IsKind(value, "Promise");
}
function PromiseOptions(type) {
  return exports_memory.Discard(type, ["~kind", "type", "item"]);
}

// node_modules/typebox/build/type/types/_immutable.mjs
function ImmutableAdd(type) {
  return exports_memory.Update(type, { "~immutable": true }, {});
}
function Immutable(type) {
  return ImmutableAdd(type);
}
function IsImmutable(value) {
  return IsSchema(value) && exports_guard.HasPropertyKey(value, "~immutable");
}

// node_modules/typebox/build/type/types/_optional.mjs
function OptionalRemove(type) {
  const result = exports_memory.Discard(type, ["~optional"]);
  return result;
}
function OptionalAdd(type) {
  return exports_memory.Update(type, { "~optional": true }, {});
}
function Optional(type) {
  return OptionalAdd(type);
}
function IsOptional(value) {
  return IsSchema(value) && exports_guard.HasPropertyKey(value, "~optional");
}

// node_modules/typebox/build/type/types/_readonly.mjs
function ReadonlyRemove(type) {
  return exports_memory.Discard(type, ["~readonly"]);
}
function ReadonlyAdd(type) {
  return exports_memory.Update(type, { "~readonly": true }, {});
}
function Readonly(type) {
  return ReadonlyAdd(type);
}
function IsReadonly(value) {
  return IsSchema(value) && exports_guard.HasPropertyKey(value, "~readonly");
}

// node_modules/typebox/build/type/types/base.mjs
function BaseProperty(value) {
  return {
    enumerable: exports_settings.Get().enumerableKind,
    writable: false,
    configurable: false,
    value
  };
}

class Base {
  constructor() {
    globalThis.Object.defineProperty(this, "~kind", BaseProperty("Base"));
    globalThis.Object.defineProperty(this, "~guard", BaseProperty({
      check: (value) => this.Check(value),
      errors: (value) => this.Errors(value)
    }));
  }
  Check(_value) {
    return true;
  }
  Errors(_value) {
    return [];
  }
  Convert(value) {
    return value;
  }
  Clean(value) {
    return value;
  }
  Default(value) {
    return value;
  }
  Create() {
    throw new Error("Create not implemented");
  }
  Clone() {
    throw Error("Clone not implemented");
  }
}
function IsBase(value) {
  return IsKind(value, "Base");
}

// node_modules/typebox/build/type/types/array.mjs
function _Array_(items, options) {
  return exports_memory.Create({ "~kind": "Array" }, { type: "array", items }, options);
}
function IsArray2(value) {
  return IsKind(value, "Array");
}
function ArrayOptions(type) {
  return exports_memory.Discard(type, ["~kind", "type", "items"]);
}

// node_modules/typebox/build/type/types/async_iterator.mjs
function AsyncIterator(iteratorItems, options) {
  return exports_memory.Create({ "~kind": "AsyncIterator" }, { type: "asyncIterator", iteratorItems }, options);
}
function IsAsyncIterator2(value) {
  return IsKind(value, "AsyncIterator");
}
function AsyncIteratorOptions(type) {
  return exports_memory.Discard(type, ["~kind", "type", "iteratorItems"]);
}

// node_modules/typebox/build/type/types/constructor.mjs
function Constructor(parameters, instanceType, options = {}) {
  return exports_memory.Create({ "~kind": "Constructor" }, { type: "constructor", parameters, instanceType }, options);
}
function IsConstructor2(value) {
  return IsKind(value, "Constructor");
}
function ConstructorOptions(type) {
  return exports_memory.Discard(type, ["~kind", "type", "parameters", "instanceType"]);
}

// node_modules/typebox/build/type/types/function.mjs
function _Function_(parameters, returnType, options = {}) {
  return exports_memory.Create({ ["~kind"]: "Function" }, { type: "function", parameters, returnType }, options);
}
function IsFunction2(value) {
  return IsKind(value, "Function");
}
function FunctionOptions(type) {
  return exports_memory.Discard(type, ["~kind", "type", "parameters", "returnType"]);
}

// node_modules/typebox/build/type/types/ref.mjs
function Ref(ref, options) {
  return exports_memory.Create({ ["~kind"]: "Ref" }, { $ref: ref }, options);
}
function IsRef(value) {
  return IsKind(value, "Ref");
}

// node_modules/typebox/build/type/types/generic.mjs
function Generic(parameters, expression) {
  return exports_memory.Create({ "~kind": "Generic" }, { type: "generic", parameters, expression });
}
function IsGeneric(value) {
  return IsKind(value, "Generic");
}

// node_modules/typebox/build/type/types/any.mjs
function Any(options) {
  return exports_memory.Create({ ["~kind"]: "Any" }, {}, options);
}
function IsAny(value) {
  return IsKind(value, "Any");
}

// node_modules/typebox/build/type/types/never.mjs
var NeverPattern = "(?!)";
function Never(options) {
  return exports_memory.Create({ "~kind": "Never" }, { not: {} }, options);
}
function IsNever(value) {
  return IsKind(value, "Never");
}

// node_modules/typebox/build/type/types/properties.mjs
function RequiredArray(properties) {
  return exports_guard.Keys(properties).filter((key) => !IsOptional(properties[key]));
}
function PropertyKeys(properties) {
  return exports_guard.Keys(properties);
}
function PropertyValues(properties) {
  return exports_guard.Values(properties);
}

// node_modules/typebox/build/type/types/object.mjs
function _Object_(properties, options = {}) {
  const requiredKeys = RequiredArray(properties);
  const required = requiredKeys.length > 0 ? { required: requiredKeys } : {};
  return exports_memory.Create({ "~kind": "Object" }, { type: "object", ...required, properties }, options);
}
function IsObject2(value) {
  return IsKind(value, "Object");
}
function ObjectOptions(type) {
  return exports_memory.Discard(type, ["~kind", "type", "properties", "required"]);
}

// node_modules/typebox/build/type/types/union.mjs
function Union(anyOf, options = {}) {
  return exports_memory.Create({ "~kind": "Union" }, { anyOf }, options);
}
function IsUnion(value) {
  return IsKind(value, "Union");
}
function UnionOptions(type) {
  return exports_memory.Discard(type, ["~kind", "anyOf"]);
}

// node_modules/typebox/build/type/types/unknown.mjs
function Unknown(options) {
  return exports_memory.Create({ ["~kind"]: "Unknown" }, {}, options);
}
function IsUnknown(value) {
  return IsKind(value, "Unknown");
}

// node_modules/typebox/build/type/types/cyclic.mjs
function Cyclic($defs, $ref, options) {
  const defs = exports_guard.Keys($defs).reduce((result, key) => {
    return { ...result, [key]: exports_memory.Update($defs[key], {}, { $id: key }) };
  }, {});
  return exports_memory.Create({ ["~kind"]: "Cyclic" }, { $defs: defs, $ref }, options);
}
function IsCyclic(value) {
  return IsKind(value, "Cyclic");
}

// node_modules/typebox/build/type/types/unsafe.mjs
function Unsafe(schema) {
  return exports_memory.Update(schema, { ["~unsafe"]: null }, {});
}
function IsUnsafe(value) {
  return exports_guard.IsObjectNotArray(value) && exports_guard.HasPropertyKey(value, "~unsafe") && exports_guard.IsNull(value["~unsafe"]);
}

// node_modules/typebox/build/system/arguments/arguments.mjs
var exports_arguments = {};
__export(exports_arguments, {
  Match: () => Match
});
function Match(args, match) {
  return match[args.length]?.(...args) ?? (() => {
    throw Error("Invalid Arguments");
  })();
}
// node_modules/typebox/build/type/types/infer.mjs
function Infer(...args) {
  const [name, extends_] = exports_arguments.Match(args, {
    2: (name2, extends_2) => [name2, extends_2, extends_2],
    1: (name2) => [name2, Unknown(), Unknown()]
  });
  return exports_memory.Create({ ["~kind"]: "Infer" }, { type: "infer", name, extends: extends_ }, {});
}
function IsInfer(value) {
  return IsKind(value, "Infer");
}

// node_modules/typebox/build/type/engine/enum/typescript_enum_to_enum_values.mjs
function IsTypeScriptEnumLike(value) {
  return exports_guard.IsObjectNotArray(value);
}
function TypeScriptEnumToEnumValues(type) {
  const keys = exports_guard.Keys(type).filter((key) => isNaN(key));
  return keys.reduce((result, key) => [...result, type[key]], []);
}

// node_modules/typebox/build/type/types/enum.mjs
function Enum(value, options) {
  const values = IsTypeScriptEnumLike(value) ? TypeScriptEnumToEnumValues(value) : value;
  return exports_memory.Create({ "~kind": "Enum" }, { enum: values }, options);
}
function IsEnum(value) {
  return IsKind(value, "Enum");
}

// node_modules/typebox/build/type/types/intersect.mjs
function Intersect(types, options = {}) {
  return exports_memory.Create({ "~kind": "Intersect" }, { allOf: types }, options);
}
function IsIntersect(value) {
  return IsKind(value, "Intersect");
}
function IntersectOptions(type) {
  return exports_memory.Discard(type, ["~kind", "allOf"]);
}
// node_modules/typebox/build/system/unreachable/unreachable.mjs
function Unreachable() {
  throw new Error("Unreachable");
}
// node_modules/typebox/build/system/hashing/hash.mjs
var ByteMarker;
(function(ByteMarker2) {
  ByteMarker2[ByteMarker2["Array"] = 0] = "Array";
  ByteMarker2[ByteMarker2["BigInt"] = 1] = "BigInt";
  ByteMarker2[ByteMarker2["Boolean"] = 2] = "Boolean";
  ByteMarker2[ByteMarker2["Date"] = 3] = "Date";
  ByteMarker2[ByteMarker2["Constructor"] = 4] = "Constructor";
  ByteMarker2[ByteMarker2["Function"] = 5] = "Function";
  ByteMarker2[ByteMarker2["Null"] = 6] = "Null";
  ByteMarker2[ByteMarker2["Number"] = 7] = "Number";
  ByteMarker2[ByteMarker2["Object"] = 8] = "Object";
  ByteMarker2[ByteMarker2["RegExp"] = 9] = "RegExp";
  ByteMarker2[ByteMarker2["String"] = 10] = "String";
  ByteMarker2[ByteMarker2["Symbol"] = 11] = "Symbol";
  ByteMarker2[ByteMarker2["TypeArray"] = 12] = "TypeArray";
  ByteMarker2[ByteMarker2["Undefined"] = 13] = "Undefined";
})(ByteMarker || (ByteMarker = {}));
var Accumulator = BigInt("14695981039346656037");
var [Prime, Size] = [BigInt("1099511628211"), BigInt("18446744073709551616")];
var Bytes = Array.from({ length: 256 }).map((_, i) => BigInt(i));
var F64 = new Float64Array(1);
var F64In = new DataView(F64.buffer);
var F64Out = new Uint8Array(F64.buffer);
var encoder = new TextEncoder;
// node_modules/typebox/build/type/types/_codec.mjs
class EncodeBuilder {
  constructor(type, decode) {
    this.type = type;
    this.decode = decode;
  }
  Encode(callback) {
    const type = this.type;
    const decode = IsCodec(type) ? (value) => this.decode(type["~codec"].decode(value)) : this.decode;
    const encode = IsCodec(type) ? (value) => type["~codec"].encode(callback(value)) : callback;
    const codec = { decode, encode };
    return exports_memory.Update(this.type, { "~codec": codec }, {});
  }
}

class DecodeBuilder {
  constructor(type) {
    this.type = type;
  }
  Decode(callback) {
    return new EncodeBuilder(this.type, callback);
  }
}
function Codec(type) {
  return new DecodeBuilder(type);
}
function Decode(type, callback) {
  return Codec(type).Decode(callback).Encode(() => {
    throw Error("Encode not implemented");
  });
}
function Encode(type, callback) {
  return Codec(type).Decode(() => {
    throw Error("Decode not implemented");
  }).Encode(callback);
}
function IsCodec(value) {
  return IsSchema(value) && exports_guard.HasPropertyKey(value, "~codec") && exports_guard.IsObject(value["~codec"]) && exports_guard.HasPropertyKey(value["~codec"], "encode") && exports_guard.HasPropertyKey(value["~codec"], "decode");
}
// node_modules/typebox/build/type/types/_refine.mjs
function RefineAdd(type, refinement) {
  const refinements = IsRefine(type) ? [...type["~refine"], refinement] : [refinement];
  return exports_memory.Update(type, { "~refine": refinements }, {});
}
function Refine(...args) {
  const [type, check, error_or_message] = exports_arguments.Match(args, {
    3: (type2, check2, error2) => [type2, check2, error2],
    2: (type2, check2) => [type2, check2, () => "Refine Error"]
  });
  const error = exports_guard.IsString(error_or_message) ? () => error_or_message : error_or_message;
  return RefineAdd(type, { check, error });
}
function IsRefinement(value) {
  return exports_guard.IsObjectNotArray(value) && exports_guard.HasPropertyKey(value, "check") && exports_guard.HasPropertyKey(value, "error") && exports_guard.IsFunction(value.check) && exports_guard.IsFunction(value.error);
}
function IsRefine(value) {
  return IsSchema(value) && exports_guard.HasPropertyKey(value, "~refine") && exports_guard.IsArray(value["~refine"]) && exports_guard.Every(value["~refine"], 0, (value2) => IsRefinement(value2));
}
// node_modules/typebox/build/type/types/bigint.mjs
var BigIntPattern = "-?(?:0|[1-9][0-9]*)n";
function BigInt2(options) {
  return exports_memory.Create({ "~kind": "BigInt" }, { type: "bigint" }, options);
}
function IsBigInt2(value) {
  return IsKind(value, "BigInt");
}
// node_modules/typebox/build/type/types/boolean.mjs
function Boolean2(options) {
  return exports_memory.Create({ "~kind": "Boolean" }, { type: "boolean" }, options);
}
function IsBoolean2(value) {
  return IsKind(value, "Boolean");
}
// node_modules/typebox/build/type/types/identifier.mjs
function Identifier(name) {
  return exports_memory.Create({ "~kind": "Identifier" }, { name });
}
function IsIdentifier(value) {
  return IsKind(value, "Identifier");
}
// node_modules/typebox/build/type/types/integer.mjs
var IntegerPattern = "-?(?:0|[1-9][0-9]*)";
function Integer(options) {
  return exports_memory.Create({ "~kind": "Integer" }, { type: "integer" }, options);
}
function IsInteger2(value) {
  return IsKind(value, "Integer");
}
// node_modules/typebox/build/type/types/iterator.mjs
function Iterator(iteratorItems, options) {
  return exports_memory.Create({ "~kind": "Iterator" }, { type: "iterator", iteratorItems }, options);
}
function IsIterator2(value) {
  return IsKind(value, "Iterator");
}
function IteratorOptions(type) {
  return exports_memory.Discard(type, ["~kind", "type", "iteratorItems"]);
}
// node_modules/typebox/build/type/types/literal.mjs
class InvalidLiteralValue extends Error {
  constructor(value) {
    super(`Invalid Literal value`);
    Object.defineProperty(this, "cause", {
      value: { value },
      writable: false,
      configurable: false,
      enumerable: false
    });
  }
}
function LiteralTypeName(value) {
  return exports_guard.IsBigInt(value) ? "bigint" : exports_guard.IsBoolean(value) ? "boolean" : exports_guard.IsNumber(value) ? "number" : exports_guard.IsString(value) ? "string" : (() => {
    throw new InvalidLiteralValue(value);
  })();
}
function Literal(value, options) {
  return exports_memory.Create({ "~kind": "Literal" }, { type: LiteralTypeName(value), const: value }, options);
}
function IsLiteralValue(value) {
  return exports_guard.IsBigInt(value) || exports_guard.IsBoolean(value) || exports_guard.IsNumber(value) || exports_guard.IsString(value);
}
function IsLiteralNumber(value) {
  return IsLiteral(value) && exports_guard.IsNumber(value.const);
}
function IsLiteralString(value) {
  return IsLiteral(value) && exports_guard.IsString(value.const);
}
function IsLiteral(value) {
  return IsKind(value, "Literal");
}
// node_modules/typebox/build/type/types/null.mjs
function Null(options) {
  return exports_memory.Create({ "~kind": "Null" }, { type: "null" }, options);
}
function IsNull2(value) {
  return IsKind(value, "Null");
}
// node_modules/typebox/build/type/types/number.mjs
var NumberPattern = "-?(?:0|[1-9][0-9]*)(?:.[0-9]+)?";
function Number2(options) {
  return exports_memory.Create({ "~kind": "Number" }, { type: "number" }, options);
}
function IsNumber2(value) {
  return IsKind(value, "Number");
}
// node_modules/typebox/build/type/types/symbol.mjs
function Symbol2(options) {
  return exports_memory.Create({ "~kind": "Symbol" }, { type: "symbol" }, options);
}
function IsSymbol2(value) {
  return IsKind(value, "Symbol");
}
// node_modules/typebox/build/type/types/parameter.mjs
function Parameter(...args) {
  const [name, extends_, equals] = exports_arguments.Match(args, {
    3: (name2, extends_2, equals2) => [name2, extends_2, equals2],
    2: (name2, extends_2) => [name2, extends_2, extends_2],
    1: (name2) => [name2, Unknown(), Unknown()]
  });
  return exports_memory.Create({ "~kind": "Parameter" }, { name, extends: extends_, equals }, {});
}
function IsParameter(value) {
  return IsKind(value, "Parameter");
}
// node_modules/typebox/build/type/types/string.mjs
var StringPattern = ".*";
function String2(options) {
  return exports_memory.Create({ "~kind": "String" }, { type: "string" }, options);
}
function IsString2(value) {
  return IsKind(value, "String");
}

// node_modules/typebox/build/type/engine/patterns/pattern.mjs
function ParsePatternIntoTypes(pattern) {
  const parsed = Pattern(pattern);
  const result = exports_guard.IsEqual(parsed.length, 2) ? parsed[0] : [];
  return result;
}

// node_modules/typebox/build/type/engine/template_literal/is_finite.mjs
function FromLiteral(_value) {
  return true;
}
function FromTypesReduce(types) {
  return exports_guard.TakeLeft(types, (left, right) => FromType(left) ? FromTypesReduce(right) : false, () => true);
}
function FromTypes(types) {
  const result = exports_guard.IsEqual(types.length, 0) ? false : FromTypesReduce(types);
  return result;
}
function FromType(type) {
  return IsUnion(type) ? FromTypes(type.anyOf) : IsLiteral(type) ? FromLiteral(type.const) : false;
}
function IsTemplateLiteralFinite(types) {
  const result = FromTypes(types);
  return result;
}

// node_modules/typebox/build/type/engine/template_literal/create.mjs
function TemplateLiteralCreate(pattern) {
  return exports_memory.Create({ ["~kind"]: "TemplateLiteral" }, { type: "string", pattern }, {});
}

// node_modules/typebox/build/type/engine/template_literal/decode.mjs
function FromLiteralPush(variants, value, result = []) {
  return exports_guard.TakeLeft(variants, (left, right) => FromLiteralPush(right, value, [...result, `${left}${value}`]), () => result);
}
function FromLiteral2(variants, value) {
  return exports_guard.IsEqual(variants.length, 0) ? [`${value}`] : FromLiteralPush(variants, value);
}
function FromUnion(variants, types, result = []) {
  return exports_guard.TakeLeft(types, (left, right) => FromUnion(variants, right, [...result, ...FromType2(variants, left)]), () => result);
}
function FromType2(variants, type) {
  const result = IsUnion(type) ? FromUnion(variants, type.anyOf) : IsLiteral(type) ? FromLiteral2(variants, type.const) : Unreachable();
  return result;
}
function DecodeFromSpan(variants, types) {
  return exports_guard.TakeLeft(types, (left, right) => DecodeFromSpan(FromType2(variants, left), right), () => variants);
}
function VariantsToLiterals(variants) {
  return variants.map((variant) => Literal(variant));
}
function DecodeTypesAsUnion(types) {
  const variants = DecodeFromSpan([], types);
  const literals = VariantsToLiterals(variants);
  const result = Union(literals);
  return result;
}
function DecodeTypes(types) {
  return exports_guard.IsEqual(types.length, 0) ? Unreachable() : exports_guard.IsEqual(types.length, 1) && IsLiteral(types[0]) ? types[0] : DecodeTypesAsUnion(types);
}
function TemplateLiteralDecodeUnsafe(pattern) {
  const types = ParsePatternIntoTypes(pattern);
  const result = exports_guard.IsEqual(types.length, 0) ? String2() : IsTemplateLiteralFinite(types) ? DecodeTypes(types) : TemplateLiteralCreate(pattern);
  return result;
}
function TemplateLiteralDecode(pattern) {
  const decoded = TemplateLiteralDecodeUnsafe(pattern);
  const result = IsTemplateLiteral(decoded) ? String2() : decoded;
  return result;
}

// node_modules/typebox/build/type/engine/record/record_create.mjs
function CreateRecord(key, value) {
  const type = "object";
  const patternProperties = { [key]: value };
  return exports_memory.Create({ ["~kind"]: "Record" }, { type, patternProperties });
}

// node_modules/typebox/build/type/engine/record/from_key_any.mjs
function FromAnyKey(value) {
  return CreateRecord(StringKey, value);
}

// node_modules/typebox/build/type/engine/record/from_key_boolean.mjs
function FromBooleanKey(value) {
  return _Object_({ true: value, false: value });
}

// node_modules/typebox/build/type/engine/enum/enum_to_union.mjs
function FromEnumValue(value) {
  return exports_guard.IsString(value) || exports_guard.IsNumber(value) ? Literal(value) : exports_guard.IsNull(value) ? Null() : Never();
}
function EnumValuesToVariants(values) {
  const result = values.map((value) => FromEnumValue(value));
  return result;
}
function EnumValuesToUnion(values) {
  const variants = EnumValuesToVariants(values);
  const result = Union(variants);
  return result;
}
function EnumToUnion(type) {
  const result = EnumValuesToUnion(type.enum);
  return result;
}

// node_modules/typebox/build/type/engine/record/from_key_enum.mjs
function FromEnumKey(values, value) {
  const unionKey = EnumValuesToUnion(values);
  const result = FromKey(unionKey, value);
  return result;
}

// node_modules/typebox/build/type/engine/record/from_key_integer.mjs
function FromIntegerKey(_key, value) {
  const result = CreateRecord(IntegerKey, value);
  return result;
}

// node_modules/typebox/build/type/types/tuple.mjs
function Tuple(types, options = {}) {
  const [items, minItems, additionalItems] = [types, types.length, false];
  return exports_memory.Create({ ["~kind"]: "Tuple" }, { type: "array", additionalItems, items, minItems }, options);
}
function IsTuple(value) {
  return IsKind(value, "Tuple");
}
function TupleOptions(type) {
  return exports_memory.Discard(type, ["~kind", "type", "items", "minItems", "additionalItems"]);
}

// node_modules/typebox/build/type/engine/tuple/to_object.mjs
function TupleElementsToProperties(types) {
  const result = types.reduceRight((result2, right, index) => {
    return { [index]: right, ...result2 };
  }, {});
  return result;
}
function TupleToObject(type) {
  const properties = TupleElementsToProperties(type.items);
  const result = _Object_(properties);
  return result;
}

// node_modules/typebox/build/type/engine/evaluate/composite.mjs
function IsReadonlyProperty(left, right) {
  return IsReadonly(left) ? IsReadonly(right) ? true : false : false;
}
function IsOptionalProperty(left, right) {
  return IsOptional(left) ? IsOptional(right) ? true : false : false;
}
function CompositeProperty(left, right) {
  const isReadonly = IsReadonlyProperty(left, right);
  const isOptional = IsOptionalProperty(left, right);
  const evaluated = EvaluateIntersect([left, right]);
  const property = ReadonlyRemove(OptionalRemove(evaluated));
  return isReadonly && isOptional ? ReadonlyAdd(OptionalAdd(property)) : isReadonly && !isOptional ? ReadonlyAdd(property) : !isReadonly && isOptional ? OptionalAdd(property) : property;
}
function CompositePropertyKey(left, right, key) {
  return key in left ? key in right ? CompositeProperty(left[key], right[key]) : left[key] : (key in right) ? right[key] : Never();
}
function CompositeProperties(left, right) {
  const keys = new Set([...exports_guard.Keys(right), ...exports_guard.Keys(left)]);
  return [...keys].reduce((result, key) => {
    return { ...result, [key]: CompositePropertyKey(left, right, key) };
  }, {});
}
function GetProperties(type) {
  const result = IsObject2(type) ? type.properties : IsTuple(type) ? TupleElementsToProperties(type.items) : Unreachable();
  return result;
}
function Composite(left, right) {
  const leftProperties = GetProperties(left);
  const rightProperties = GetProperties(right);
  const properties = CompositeProperties(leftProperties, rightProperties);
  return _Object_(properties);
}

// node_modules/typebox/build/type/engine/evaluate/narrow.mjs
function Narrow(left, right) {
  const result = Compare(left, right);
  return exports_guard.IsEqual(result, ResultLeftInside) ? left : exports_guard.IsEqual(result, ResultRightInside) ? right : exports_guard.IsEqual(result, ResultEqual) ? right : Never();
}

// node_modules/typebox/build/type/engine/evaluate/distribute.mjs
function IsObjectLike(type) {
  return IsObject2(type) || IsTuple(type);
}
function IsUnionOperand(left, right) {
  const isUnionLeft = IsUnion(left);
  const isUnionRight = IsUnion(right);
  const result = isUnionLeft || isUnionRight;
  return result;
}
function DistributeOperation(left, right) {
  const evaluatedLeft = EvaluateType(left);
  const evaluatedRight = EvaluateType(right);
  const isUnionOperand = IsUnionOperand(evaluatedLeft, evaluatedRight);
  const isObjectLeft = IsObjectLike(evaluatedLeft);
  const IsObjectRight = IsObjectLike(evaluatedRight);
  const result = isUnionOperand ? EvaluateIntersect([evaluatedLeft, evaluatedRight]) : isObjectLeft && IsObjectRight ? Composite(evaluatedLeft, evaluatedRight) : isObjectLeft && !IsObjectRight ? evaluatedLeft : !isObjectLeft && IsObjectRight ? evaluatedRight : Narrow(evaluatedLeft, evaluatedRight);
  return result;
}
function DistributeType(type, types, result = []) {
  return exports_guard.TakeLeft(types, (left, right) => DistributeType(type, right, [...result, DistributeOperation(type, left)]), () => exports_guard.IsEqual(result.length, 0) ? [type] : result);
}
function DistributeUnion(types, distribution, result = []) {
  return exports_guard.TakeLeft(types, (left, right) => DistributeUnion(right, distribution, [...result, ...Distribute([left], distribution)]), () => result);
}
function Distribute(types, result = []) {
  return exports_guard.TakeLeft(types, (left, right) => IsUnion(left) ? Distribute(right, DistributeUnion(left.anyOf, result)) : Distribute(right, DistributeType(left, result)), () => result);
}

// node_modules/typebox/build/type/engine/evaluate/evaluate.mjs
function EvaluateIntersect(types) {
  const distribution = Distribute(types);
  const result = Broaden(distribution);
  return result;
}
function EvaluateUnion(types) {
  const result = Broaden(types);
  return result;
}
function EvaluateType(type) {
  return IsIntersect(type) ? EvaluateIntersect(type.allOf) : IsUnion(type) ? EvaluateUnion(type.anyOf) : type;
}
function EvaluateUnionFast(types) {
  const result = exports_guard.IsEqual(types.length, 1) ? types[0] : exports_guard.IsEqual(types.length, 0) ? Never() : Union(types);
  return result;
}

// node_modules/typebox/build/type/engine/record/from_key_intersect.mjs
function FromIntersectKey(types, value) {
  const evaluatedKey = EvaluateIntersect(types);
  const result = FromKey(evaluatedKey, value);
  return result;
}

// node_modules/typebox/build/type/engine/record/from_key_literal.mjs
function FromLiteralKey(key, value) {
  return exports_guard.IsString(key) || exports_guard.IsNumber(key) ? _Object_({ [key]: value }) : exports_guard.IsEqual(key, false) ? _Object_({ false: value }) : exports_guard.IsEqual(key, true) ? _Object_({ true: value }) : _Object_({});
}

// node_modules/typebox/build/type/engine/record/from_key_number.mjs
function FromNumberKey(_key, value) {
  const result = CreateRecord(NumberKey, value);
  return result;
}

// node_modules/typebox/build/type/engine/record/from_key_string.mjs
function FromStringKey(key, value) {
  return exports_guard.HasPropertyKey(key, "pattern") && (exports_guard.IsString(key.pattern) || key.pattern instanceof RegExp) ? CreateRecord(key.pattern.toString(), value) : CreateRecord(StringKey, value);
}

// node_modules/typebox/build/type/engine/record/from_key_template_literal.mjs
function FromTemplateKey(pattern, value) {
  const types = ParsePatternIntoTypes(pattern);
  const finite = IsTemplateLiteralFinite(types);
  const result = finite ? FromKey(TemplateLiteralDecode(pattern), value) : CreateRecord(pattern, value);
  return result;
}

// node_modules/typebox/build/type/engine/evaluate/flatten.mjs
function FlattenType(type) {
  const result = IsUnion(type) ? Flatten(type.anyOf) : [type];
  return result;
}
function Flatten(types) {
  return types.reduce((result, type) => {
    return [...result, ...FlattenType(type)];
  }, []);
}

// node_modules/typebox/build/type/engine/record/from_key_union.mjs
function StringOrNumberCheck(types) {
  return types.some((type) => IsString2(type) || IsNumber2(type) || IsInteger2(type));
}
function TryBuildRecord(types, value) {
  return exports_guard.IsEqual(StringOrNumberCheck(types), true) ? CreateRecord(StringKey, value) : undefined;
}
function CreateProperties(types, value) {
  return types.reduce((result, left) => {
    return IsLiteral(left) && (exports_guard.IsString(left.const) || exports_guard.IsNumber(left.const)) ? { ...result, [left.const]: value } : result;
  }, {});
}
function CreateObject(types, value) {
  const properties = CreateProperties(types, value);
  const result = _Object_(properties);
  return result;
}
function FromUnionKey(types, value) {
  const flattened = Flatten(types);
  const record = TryBuildRecord(flattened, value);
  return IsSchema(record) ? record : CreateObject(flattened, value);
}

// node_modules/typebox/build/type/engine/record/from_key.mjs
function FromKey(key, value) {
  const result = IsAny(key) ? FromAnyKey(value) : IsBoolean2(key) ? FromBooleanKey(value) : IsEnum(key) ? FromEnumKey(key.enum, value) : IsInteger2(key) ? FromIntegerKey(key, value) : IsIntersect(key) ? FromIntersectKey(key.allOf, value) : IsLiteral(key) ? FromLiteralKey(key.const, value) : IsNumber2(key) ? FromNumberKey(key, value) : IsUnion(key) ? FromUnionKey(key.anyOf, value) : IsString2(key) ? FromStringKey(key, value) : IsTemplateLiteral(key) ? FromTemplateKey(key.pattern, value) : _Object_({});
  return result;
}

// node_modules/typebox/build/type/engine/record/instantiate.mjs
function RecordAction(key, value, options) {
  const result = CanInstantiate([key]) ? exports_memory.Update(FromKey(key, value), {}, options) : RecordDeferred(key, value, options);
  return result;
}
function RecordInstantiate(context, state, key, value, options) {
  const instantiatedKey = InstantiateType(context, state, key);
  const instantiatedValue = InstantiateType(context, state, value);
  return RecordAction(instantiatedKey, instantiatedValue, options);
}

// node_modules/typebox/build/type/types/record.mjs
var IntegerKey = `^${IntegerPattern}$`;
var NumberKey = `^${NumberPattern}$`;
var StringKey = `^${StringPattern}$`;
function RecordDeferred(key, value, options = {}) {
  return Deferred("Record", [key, value], options);
}
function Record(key, value, options = {}) {
  return RecordAction(key, value, options);
}
function RecordFromPattern(key, value) {
  return CreateRecord(key, value);
}
function RecordPattern(type) {
  return exports_guard.Keys(type.patternProperties)[0];
}
function RecordKey(type) {
  const pattern = RecordPattern(type);
  const result = exports_guard.IsEqual(pattern, StringKey) ? String2() : exports_guard.IsEqual(pattern, IntegerKey) ? Integer() : exports_guard.IsEqual(pattern, NumberKey) ? Number2() : TemplateLiteralDecodeUnsafe(pattern);
  return result;
}
function RecordValue(type) {
  return type.patternProperties[RecordPattern(type)];
}
function IsRecord(value) {
  return IsKind(value, "Record");
}
// node_modules/typebox/build/type/types/rest.mjs
function Rest(type) {
  return exports_memory.Create({ "~kind": "Rest" }, { type: "rest", items: type }, {});
}
function IsRest(value) {
  return IsKind(value, "Rest");
}
// node_modules/typebox/build/type/types/this.mjs
function This(options) {
  return exports_memory.Create({ ["~kind"]: "This" }, { $ref: "#" }, options);
}
function IsThis(value) {
  return IsKind(value, "This");
}
// node_modules/typebox/build/type/types/undefined.mjs
function Undefined(options) {
  return exports_memory.Create({ "~kind": "Undefined" }, { type: "undefined" }, options);
}
function IsUndefined2(value) {
  return IsKind(value, "Undefined");
}
// node_modules/typebox/build/type/types/void.mjs
function Void(options) {
  return exports_memory.Create({ "~kind": "Void" }, { type: "void" }, options);
}
function IsVoid(value) {
  return IsKind(value, "Void");
}
// node_modules/typebox/build/type/script/mapping.mjs
function IntrinsicOrCall(ref2, parameters) {
  return exports_guard.IsEqual(ref2, "Array") ? _Array_(parameters[0]) : exports_guard.IsEqual(ref2, "AsyncIterator") ? AsyncIterator(parameters[0]) : exports_guard.IsEqual(ref2, "Iterator") ? Iterator(parameters[0]) : exports_guard.IsEqual(ref2, "Promise") ? _Promise_(parameters[0]) : exports_guard.IsEqual(ref2, "Awaited") ? AwaitedDeferred(parameters[0]) : exports_guard.IsEqual(ref2, "Capitalize") ? CapitalizeDeferred(parameters[0]) : exports_guard.IsEqual(ref2, "ConstructorParameters") ? ConstructorParametersDeferred(parameters[0]) : exports_guard.IsEqual(ref2, "Evaluate") ? EvaluateDeferred(parameters[0]) : exports_guard.IsEqual(ref2, "Exclude") ? ExcludeDeferred(parameters[0], parameters[1]) : exports_guard.IsEqual(ref2, "Extract") ? ExtractDeferred(parameters[0], parameters[1]) : exports_guard.IsEqual(ref2, "Index") ? IndexDeferred(parameters[0], parameters[1]) : exports_guard.IsEqual(ref2, "InstanceType") ? InstanceTypeDeferred(parameters[0]) : exports_guard.IsEqual(ref2, "Lowercase") ? LowercaseDeferred(parameters[0]) : exports_guard.IsEqual(ref2, "NonNullable") ? NonNullableDeferred(parameters[0]) : exports_guard.IsEqual(ref2, "Omit") ? OmitDeferred(parameters[0], parameters[1]) : exports_guard.IsEqual(ref2, "Options") ? OptionsDeferred(parameters[0], parameters[1]) : exports_guard.IsEqual(ref2, "Parameters") ? ParametersDeferred(parameters[0]) : exports_guard.IsEqual(ref2, "Partial") ? PartialDeferred(parameters[0]) : exports_guard.IsEqual(ref2, "Pick") ? PickDeferred(parameters[0], parameters[1]) : exports_guard.IsEqual(ref2, "Readonly") ? ReadonlyObjectDeferred(parameters[0]) : exports_guard.IsEqual(ref2, "KeyOf") ? KeyOfDeferred(parameters[0]) : exports_guard.IsEqual(ref2, "Record") ? RecordDeferred(parameters[0], parameters[1]) : exports_guard.IsEqual(ref2, "Required") ? RequiredDeferred(parameters[0]) : exports_guard.IsEqual(ref2, "ReturnType") ? ReturnTypeDeferred(parameters[0]) : exports_guard.IsEqual(ref2, "Uncapitalize") ? UncapitalizeDeferred(parameters[0]) : exports_guard.IsEqual(ref2, "Uppercase") ? UppercaseDeferred(parameters[0]) : CallConstruct(Ref(ref2), parameters);
}
function Unreachable2() {
  throw Error("Unreachable");
}
var DelimitedDecode = (input, result = []) => {
  return input.reduce((result2, left) => {
    return exports_guard.IsArray(left) && exports_guard.IsEqual(left.length, 2) ? [...result2, left[0]] : [...result2, left];
  }, []);
};
var Delimited = (input) => {
  const [left, right] = input;
  return DelimitedDecode([...left, ...right]);
};
function GenericParameterExtendsEqualsMapping(input) {
  return Parameter(input[0], input[2], input[4]);
}
function GenericParameterExtendsMapping(input) {
  return Parameter(input[0], input[2], input[2]);
}
function GenericParameterEqualsMapping(input) {
  return Parameter(input[0], Unknown(), input[2]);
}
function GenericParameterIdentifierMapping(input) {
  return Parameter(input, Unknown(), Unknown());
}
function GenericParameterMapping(input) {
  return input;
}
function GenericParameterListMapping(input) {
  return Delimited(input);
}
function GenericParametersMapping(input) {
  return input[1];
}
function GenericCallArgumentListMapping(input) {
  return Delimited(input);
}
function GenericCallArgumentsMapping(input) {
  return input[1];
}
function GenericCallMapping(input) {
  return IntrinsicOrCall(input[0], input[1]);
}
function OptionalSemiColonMapping(input) {
  return null;
}
function KeywordStringMapping(input) {
  return String2();
}
function KeywordNumberMapping(input) {
  return Number2();
}
function KeywordBooleanMapping(input) {
  return Boolean2();
}
function KeywordUndefinedMapping(input) {
  return Undefined();
}
function KeywordNullMapping(input) {
  return Null();
}
function KeywordIntegerMapping(input) {
  return Integer();
}
function KeywordBigIntMapping(input) {
  return BigInt2();
}
function KeywordUnknownMapping(input) {
  return Unknown();
}
function KeywordAnyMapping(input) {
  return Any();
}
function KeywordObjectMapping(input) {
  return _Object_({});
}
function KeywordNeverMapping(input) {
  return Never();
}
function KeywordSymbolMapping(input) {
  return Symbol2();
}
function KeywordVoidMapping(input) {
  return Void();
}
function KeywordThisMapping(input) {
  return This();
}
function KeywordMapping(input) {
  return input;
}
function TemplateInterpolateMapping(input) {
  return input[1];
}
function TemplateSpanMapping(input) {
  return Literal(input);
}
function TemplateBodyMapping(input) {
  return exports_guard.IsEqual(input.length, 3) ? [input[0], input[1], ...input[2]] : [input[0]];
}
function TemplateLiteralTypesMapping(input) {
  return input[1];
}
function TemplateLiteralMapping(input) {
  return TemplateLiteralDeferred(input);
}
function LiteralBigIntMapping(input) {
  return Literal(BigInt(input));
}
function LiteralBooleanMapping(input) {
  return Literal(exports_guard.IsEqual(input, "true"));
}
function LiteralNumberMapping(input) {
  return Literal(parseFloat(input));
}
function LiteralStringMapping(input) {
  return Literal(input);
}
function LiteralMapping(input) {
  return input;
}
function KeyOfMapping(input) {
  return input.length > 0;
}
function IndexArrayMapping(input) {
  return input.reduce((result, current) => {
    return exports_guard.IsEqual(current.length, 3) ? [...result, [current[1]]] : [...result, []];
  }, []);
}
function ExtendsMapping(input) {
  return exports_guard.IsEqual(input.length, 6) ? [input[1], input[3], input[5]] : [];
}
function BaseMapping(input) {
  return exports_guard.IsArray(input) && exports_guard.IsEqual(input.length, 3) ? input[1] : input;
}
var FactorIndexArray = (Type, indexArray) => {
  return indexArray.reduce((result, left) => {
    const _left = left;
    return exports_guard.IsEqual(_left.length, 1) ? IndexDeferred(result, _left[0]) : exports_guard.IsEqual(_left.length, 0) ? _Array_(result) : Unreachable2();
  }, Type);
};
var FactorExtends = (type, extend) => {
  return exports_guard.IsEqual(extend.length, 3) ? ConditionalDeferred(type, extend[0], extend[1], extend[2]) : type;
};
function FactorMapping(input) {
  const [keyOf, type, indexArray, extend] = input;
  return keyOf ? FactorExtends(KeyOfDeferred(FactorIndexArray(type, indexArray)), extend) : FactorExtends(FactorIndexArray(type, indexArray), extend);
}
function ExprBinaryMapping(left, rest2) {
  return exports_guard.IsEqual(rest2.length, 3) ? (() => {
    const [operator, right, next] = rest2;
    const Schema = ExprBinaryMapping(right, next);
    if (exports_guard.IsEqual(operator, "&")) {
      return IsIntersect(Schema) ? Intersect([left, ...Schema.allOf]) : Intersect([left, Schema]);
    }
    if (exports_guard.IsEqual(operator, "|")) {
      return IsUnion(Schema) ? Union([left, ...Schema.anyOf]) : Union([left, Schema]);
    }
    Unreachable2();
  })() : left;
}
function ExprTermTailMapping(input) {
  return input;
}
function ExprTermMapping(input) {
  const [left, rest2] = input;
  return ExprBinaryMapping(left, rest2);
}
function ExprTailMapping(input) {
  return input;
}
function ExprMapping(input) {
  const [left, rest2] = input;
  return ExprBinaryMapping(left, rest2);
}
function ExprReadonlyMapping(input) {
  return ImmutableAdd(input[1]);
}
function ExprPipeMapping(input) {
  return input[1];
}
function GenericTypeMapping(input) {
  return Generic(input[0], input[2]);
}
function InferTypeMapping(input) {
  return exports_guard.IsEqual(input.length, 4) ? Infer(input[1], input[3]) : exports_guard.IsEqual(input.length, 2) ? Infer(input[1], Unknown()) : Unreachable2();
}
function TypeMapping(input) {
  return input;
}
function PropertyKeyNumberMapping(input) {
  return `${input}`;
}
function PropertyKeyIdentMapping(input) {
  return input;
}
function PropertyKeyQuotedMapping(input) {
  return input;
}
function PropertyKeyIndexMapping(input) {
  return IsInteger2(input[3]) ? IntegerKey : IsNumber2(input[3]) ? NumberKey : IsSymbol2(input[3]) ? StringKey : IsString2(input[3]) ? StringKey : Unreachable2();
}
function PropertyKeyMapping(input) {
  return input;
}
function ReadonlyMapping(input) {
  return input.length > 0;
}
function OptionalMapping(input) {
  return input.length > 0;
}
function PropertyMapping(input) {
  const [isReadonly, key, isOptional, _colon, type] = input;
  return {
    [key]: isReadonly && isOptional ? ReadonlyAdd(OptionalAdd(type)) : isReadonly && !isOptional ? ReadonlyAdd(type) : !isReadonly && isOptional ? OptionalAdd(type) : type
  };
}
function PropertyDelimiterMapping(input) {
  return input;
}
function PropertyListMapping(input) {
  return Delimited(input);
}
function PropertiesReduce(propertyList) {
  return propertyList.reduce((result, left) => {
    const isPatternProperties = exports_guard.HasPropertyKey(left, IntegerKey) || exports_guard.HasPropertyKey(left, NumberKey) || exports_guard.HasPropertyKey(left, StringKey);
    return isPatternProperties ? [result[0], exports_memory.Assign(result[1], left)] : [exports_memory.Assign(result[0], left), result[1]];
  }, [{}, {}]);
}
function PropertiesMapping(input) {
  return PropertiesReduce(input[1]);
}
function _Object_Mapping(input) {
  const [properties2, patternProperties] = input;
  const options = exports_guard.IsEqual(exports_guard.Keys(patternProperties).length, 0) ? {} : { patternProperties };
  return _Object_(properties2, options);
}
function ElementNamedMapping(input) {
  return exports_guard.IsEqual(input.length, 5) ? ReadonlyAdd(OptionalAdd(input[4])) : exports_guard.IsEqual(input.length, 3) ? input[2] : exports_guard.IsEqual(input.length, 4) ? exports_guard.IsEqual(input[2], "readonly") ? ReadonlyAdd(input[3]) : OptionalAdd(input[3]) : Unreachable2();
}
function ElementReadonlyOptionalMapping(input) {
  return ReadonlyAdd(OptionalAdd(input[1]));
}
function ElementReadonlyMapping(input) {
  return ReadonlyAdd(input[1]);
}
function ElementOptionalMapping(input) {
  return OptionalAdd(input[0]);
}
function ElementBaseMapping(input) {
  return input;
}
function ElementMapping(input) {
  return exports_guard.IsEqual(input.length, 2) ? Rest(input[1]) : exports_guard.IsEqual(input.length, 1) ? input[0] : Unreachable2();
}
function ElementListMapping(input) {
  return Delimited(input);
}
function TupleMapping(input) {
  return Tuple(input[1]);
}
function ParameterReadonlyOptionalMapping(input) {
  return ReadonlyAdd(OptionalAdd(input[4]));
}
function ParameterReadonlyMapping(input) {
  return ReadonlyAdd(input[3]);
}
function ParameterOptionalMapping(input) {
  return OptionalAdd(input[3]);
}
function ParameterTypeMapping(input) {
  return input[2];
}
function ParameterBaseMapping(input) {
  return input;
}
function ParameterMapping(input) {
  return exports_guard.IsEqual(input.length, 2) ? Rest(input[1]) : exports_guard.IsEqual(input.length, 1) ? input[0] : Unreachable2();
}
function ParameterListMapping(input) {
  return Delimited(input);
}
function _Function_Mapping(input) {
  return _Function_(input[1], input[4]);
}
function ConstructorMapping(input) {
  return Constructor(input[2], input[5]);
}
function ApplyReadonly(state, type) {
  return exports_guard.IsEqual(state, "remove") ? ReadonlyRemoveAction(type) : exports_guard.IsEqual(state, "add") ? ReadonlyAddAction(type) : type;
}
function MappedReadonlyMapping(input) {
  return exports_guard.IsEqual(input.length, 2) && exports_guard.IsEqual(input[0], "-") ? "remove" : exports_guard.IsEqual(input.length, 2) && exports_guard.IsEqual(input[0], "+") ? "add" : exports_guard.IsEqual(input.length, 1) ? "add" : "none";
}
function ApplyOptional(state, type) {
  return exports_guard.IsEqual(state, "remove") ? OptionalRemoveAction(type) : exports_guard.IsEqual(state, "add") ? OptionalAddAction(type) : type;
}
function MappedOptionalMapping(input) {
  return exports_guard.IsEqual(input.length, 2) && exports_guard.IsEqual(input[0], "-") ? "remove" : exports_guard.IsEqual(input.length, 2) && exports_guard.IsEqual(input[0], "+") ? "add" : exports_guard.IsEqual(input.length, 1) ? "add" : "none";
}
function MappedAsMapping(input) {
  return exports_guard.IsEqual(input.length, 2) ? [input[1]] : [];
}
function MappedMapping(input) {
  return exports_guard.IsArray(input[6]) && exports_guard.IsEqual(input[6].length, 1) ? MappedDeferred(Identifier(input[3]), input[5], input[6][0], ApplyReadonly(input[1], ApplyOptional(input[8], input[10]))) : MappedDeferred(Identifier(input[3]), input[5], Ref(input[3]), ApplyReadonly(input[1], ApplyOptional(input[8], input[10])));
}
function ReferenceMapping(input) {
  return Ref(input);
}
function OptionsMapping(input) {
  return OptionsDeferred(input[2], input[4]);
}
function JsonNumberMapping(input) {
  return parseFloat(input);
}
function JsonBooleanMapping(input) {
  return exports_guard.IsEqual(input, "true");
}
function JsonStringMapping(input) {
  return input;
}
function JsonNullMapping(input) {
  return null;
}
function JsonPropertyMapping(input) {
  return { [input[0]]: input[2] };
}
function JsonPropertyListMapping(input) {
  return Delimited(input);
}
function JsonObjectMappingReduce(propertyList) {
  return propertyList.reduce((result, left) => {
    return exports_memory.Assign(result, left);
  }, {});
}
function JsonObjectMapping(input) {
  return JsonObjectMappingReduce(input[1]);
}
function JsonElementListMapping(input) {
  return Delimited(input);
}
function JsonArrayMapping(input) {
  return input[1];
}
function JsonMapping(input) {
  return input;
}
function PatternBigIntMapping(input) {
  return BigInt2();
}
function PatternStringMapping(input) {
  return String2();
}
function PatternNumberMapping(input) {
  return Number2();
}
function PatternIntegerMapping(input) {
  return Integer();
}
function PatternNeverMapping(input) {
  return Never();
}
function PatternTextMapping(input) {
  return Literal(input);
}
function PatternBaseMapping(input) {
  return input;
}
function PatternGroupMapping(input) {
  return Union(input[1]);
}
function PatternUnionMapping(input) {
  return input.length === 3 ? [...input[0], ...input[2]] : input.length === 1 ? [...input[0]] : [];
}
function PatternTermMapping(input) {
  return [input[0], ...input[1]];
}
function PatternBodyMapping(input) {
  return input;
}
function PatternMapping(input) {
  return input[1];
}
function InterfaceDeclarationHeritageListMapping(input) {
  return Delimited(input);
}
function InterfaceDeclarationHeritageMapping(input) {
  return exports_guard.IsEqual(input.length, 2) ? input[1] : [];
}
function InterfaceDeclarationGenericMapping(input) {
  const parameters = input[2];
  const heritage = input[3];
  const [properties2, patternProperties] = input[4];
  const options = exports_guard.IsEqual(exports_guard.Keys(patternProperties).length, 0) ? {} : { patternProperties };
  return { [input[1]]: Generic(parameters, InterfaceDeferred(heritage, properties2, options)) };
}
function InterfaceDeclarationMapping(input) {
  const heritage = input[2];
  const [properties2, patternProperties] = input[3];
  const options = exports_guard.IsEqual(exports_guard.Keys(patternProperties).length, 0) ? {} : { patternProperties };
  return { [input[1]]: InterfaceDeferred(heritage, properties2, options) };
}
function TypeAliasDeclarationGenericMapping(input) {
  return { [input[1]]: Generic(input[2], input[4]) };
}
function TypeAliasDeclarationMapping(input) {
  return { [input[1]]: input[3] };
}
function ExportKeywordMapping(input) {
  return null;
}
function ModuleDeclarationDelimiterMapping(input) {
  return input;
}
function ModuleDeclarationListMapping(input) {
  return PropertiesReduce(Delimited(input));
}
function ModuleDeclarationMapping(input) {
  return input[1];
}
function ModuleMapping(input) {
  const moduleDeclaration = input[0];
  const moduleDeclarationList = input[1];
  return ModuleDeferred(exports_memory.Assign(moduleDeclaration, moduleDeclarationList[0]));
}
function ScriptMapping(input) {
  return input;
}
// node_modules/typebox/build/type/script/token/internal/match.mjs
function IsMatch(value) {
  return IsEqual(value.length, 2);
}
function Match2(input, ok, fail) {
  return IsMatch(input) ? ok(input[0], input[1]) : fail();
}

// node_modules/typebox/build/type/script/token/internal/take.mjs
function TakeVariant(variant, input) {
  return IsEqual(input.indexOf(variant), 0) ? [variant, input.slice(variant.length)] : [];
}
function Take(variants, input) {
  for (let i = 0;i < variants.length; i++) {
    const result = TakeVariant(variants[i], input);
    if (IsMatch(result))
      return result;
  }
  return [];
}

// node_modules/typebox/build/type/script/token/internal/char.mjs
function Range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, i) => String.fromCharCode(start + i));
}
var Alpha = [
  ...Range(97, 122),
  ...Range(65, 90)
];
var Zero = "0";
var NonZero = Range(49, 57);
var Digit = [Zero, ...NonZero];
var WhiteSpace = " ";
var NewLine = `
`;
var UnderScore = "_";
var Dot = ".";
var DollarSign = "$";
var Hyphen = "-";

// node_modules/typebox/build/type/script/token/internal/trim.mjs
var LineComment = "//";
var OpenComment = "/*";
var CloseComment = "*/";
function DiscardMultilineComment(input) {
  const index = input.indexOf(CloseComment);
  const result = IsEqual(index, -1) ? "" : input.slice(index + 2);
  return result;
}
function DiscardLineComment(input) {
  const index = input.indexOf(NewLine);
  const result = IsEqual(index, -1) ? "" : input.slice(index);
  return result;
}
function TrimStartUntilNewline(input) {
  return input.replace(/^[ \t\r\f\v]+/, "");
}
function TrimWhitespace(input) {
  const trimmed = TrimStartUntilNewline(input);
  return trimmed.startsWith(OpenComment) ? TrimWhitespace(DiscardMultilineComment(trimmed.slice(2))) : trimmed.startsWith(LineComment) ? TrimWhitespace(DiscardLineComment(trimmed.slice(2))) : trimmed;
}
function Trim(input) {
  const trimmed = input.trimStart();
  return trimmed.startsWith(OpenComment) ? Trim(DiscardMultilineComment(trimmed.slice(2))) : trimmed.startsWith(LineComment) ? Trim(DiscardLineComment(trimmed.slice(2))) : trimmed;
}

// node_modules/typebox/build/type/script/token/internal/optional.mjs
function Optional2(value, input) {
  return Match2(Take([value], input), (Optional3, Rest2) => [Optional3, Rest2], () => ["", input]);
}

// node_modules/typebox/build/type/script/token/internal/many.mjs
function IsDiscard(discard2, input) {
  return discard2.includes(input);
}
function Many(allowed, discard2, input, result = "") {
  return Match2(Take(allowed, input), (Char, Rest2) => IsDiscard(discard2, Char) ? Many(allowed, discard2, Rest2, result) : Many(allowed, discard2, Rest2, `${result}${Char}`), () => [result, input]);
}

// node_modules/typebox/build/type/script/token/unsigned_integer.mjs
function TakeNonZero(input) {
  return Take(NonZero, input);
}
var AllowedDigits = [...Digit, UnderScore];
function TakeDigits(input) {
  return Many(AllowedDigits, [UnderScore], input);
}
function TakeUnsignedInteger(input) {
  return Match2(Take([Zero], input), (Zero2, ZeroRest) => [Zero2, ZeroRest], () => Match2(TakeNonZero(input), (NonZero2, NonZeroRest) => Match2(TakeDigits(NonZeroRest), (Digits, DigitsRest) => [`${NonZero2}${Digits}`, DigitsRest], () => []), () => []));
}
function UnsignedInteger(input) {
  return TakeUnsignedInteger(Trim(input));
}

// node_modules/typebox/build/type/script/token/integer.mjs
function TakeSign(input) {
  return Optional2(Hyphen, input);
}
function TakeSignedInteger(input) {
  return Match2(TakeSign(input), (Sign, SignRest) => Match2(UnsignedInteger(SignRest), (UnsignedInteger2, UnsignedIntegerRest) => [`${Sign}${UnsignedInteger2}`, UnsignedIntegerRest], () => []), () => []);
}
function Integer2(input) {
  return TakeSignedInteger(Trim(input));
}

// node_modules/typebox/build/type/script/token/bigint.mjs
function TakeBigInt(input) {
  return Match2(Integer2(input), (Integer3, IntegerRest) => Match2(Take(["n"], IntegerRest), (_N, NRest) => [`${Integer3}`, NRest], () => []), () => []);
}
function BigInt3(input) {
  return TakeBigInt(input);
}
// node_modules/typebox/build/type/script/token/const.mjs
function TakeConst(const_, input) {
  return Take([const_], input);
}
function Const(const_, input) {
  return IsEqual(const_, "") ? ["", input] : const_.startsWith(NewLine) ? TakeConst(const_, TrimWhitespace(input)) : const_.startsWith(WhiteSpace) ? TakeConst(const_, input) : TakeConst(const_, Trim(input));
}
// node_modules/typebox/build/type/script/token/ident.mjs
var Initial = [...Alpha, UnderScore, DollarSign];
function TakeInitial(input) {
  return Take(Initial, input);
}
var Remaining = [...Initial, ...Digit];
function TakeRemaining(input, result = "") {
  return Match2(Take(Remaining, input), (Remaining2, RemainingRest) => TakeRemaining(RemainingRest, `${result}${Remaining2}`), () => [result, input]);
}
function TakeIdent(input) {
  return Match2(TakeInitial(input), (Initial2, InitialRest) => Match2(TakeRemaining(InitialRest), (Remaining2, RemainingRest) => [`${Initial2}${Remaining2}`, RemainingRest], () => []), () => []);
}
function Ident(input) {
  return TakeIdent(Trim(input));
}
// node_modules/typebox/build/type/script/token/unsigned_number.mjs
var AllowedDigits2 = [...Digit, UnderScore];
function IsLeadingDot(input) {
  return IsMatch(Take([Dot], input));
}
function TakeFractional(input) {
  return Match2(Many(AllowedDigits2, [UnderScore], input), (Digits, DigitsRest) => IsEqual(Digits, "") ? [] : [Digits, DigitsRest], () => []);
}
function LeadingDot(input) {
  return Match2(Take([Dot], input), (Dot2, DotRest) => Match2(TakeFractional(DotRest), (Fractional, FractionalRest) => [`0${Dot2}${Fractional}`, FractionalRest], () => []), () => []);
}
function LeadingInteger(input) {
  return Match2(UnsignedInteger(input), (Integer3, IntegerRest) => Match2(Take([Dot], IntegerRest), (Dot2, DotRest) => Match2(TakeFractional(DotRest), (Fractional, FractionalRest) => [`${Integer3}${Dot2}${Fractional}`, FractionalRest], () => [`${Integer3}`, DotRest]), () => [`${Integer3}`, IntegerRest]), () => []);
}
function TakeUnsignedNumber(input) {
  return IsLeadingDot(input) ? LeadingDot(input) : LeadingInteger(input);
}
function UnsignedNumber(input) {
  return TakeUnsignedNumber(Trim(input));
}

// node_modules/typebox/build/type/script/token/number.mjs
function TakeSign2(input) {
  return Optional2(Hyphen, input);
}
function TakeSignedNumber(input) {
  return Match2(TakeSign2(input), (Sign, SignRest) => Match2(UnsignedNumber(SignRest), (UnsignedInteger2, UnsignedIntegerRest) => [`${Sign}${UnsignedInteger2}`, UnsignedIntegerRest], () => []), () => []);
}
function Number3(input) {
  return TakeSignedNumber(Trim(input));
}
// node_modules/typebox/build/type/script/token/until.mjs
function TakeOne(input) {
  const result = IsEqual(input, "") ? [] : [input.slice(0, 1), input.slice(1)];
  return result;
}
function IsInputMatchSentinal(end, input) {
  return TakeLeft(end, (left, right) => input.startsWith(left) ? true : IsInputMatchSentinal(right, input), () => false);
}
function Until(end, input, result = "") {
  return Match2(TakeOne(input), (One, Rest2) => IsInputMatchSentinal(end, input) ? [result, input] : Until(end, Rest2, `${result}${One}`), () => []);
}

// node_modules/typebox/build/type/script/token/span.mjs
function MultiLine(start, end, input) {
  return Match2(Take([start], input), (_, Rest2) => Match2(Until([end], Rest2), (Until2, UntilRest) => Match2(Take([end], UntilRest), (_2, Rest3) => [`${Until2}`, Rest3], () => []), () => []), () => []);
}
function SingleLine(start, end, input) {
  return Match2(Take([start], input), (_, Rest2) => Match2(Until([NewLine, end], Rest2), (Until2, UntilRest) => Match2(Take([end], UntilRest), (_2, EndRest) => [`${Until2}`, EndRest], () => []), () => []), () => []);
}
function Span(start, end, multiLine, input) {
  return multiLine ? MultiLine(start, end, Trim(input)) : SingleLine(start, end, Trim(input));
}
// node_modules/typebox/build/type/script/token/string.mjs
function TakeInitial2(quotes, input) {
  return Take(quotes, input);
}
function TakeSpan(quote, input) {
  return Span(quote, quote, false, input);
}
function TakeString(quotes, input) {
  return Match2(TakeInitial2(quotes, input), (Initial2, InitialRest) => TakeSpan(Initial2, `${Initial2}${InitialRest}`), () => []);
}
function String3(quotes, input) {
  return TakeString(quotes, Trim(input));
}
// node_modules/typebox/build/type/script/token/until_1.mjs
function Until_1(end, input) {
  return Match2(Until(end, input), (Until2, UntilRest) => IsEqual(Until2, "") ? [] : [Until2, UntilRest], () => []);
}
// node_modules/typebox/build/type/script/parser.mjs
var If = (result, left, right = () => []) => result.length === 2 ? left(result) : right();
var GenericParameterExtendsEquals = (input) => If(If(Ident(input), ([_0, input2]) => If(Const("extends", input2), ([_1, input3]) => If(Type(input3), ([_2, input4]) => If(Const("=", input4), ([_3, input5]) => If(Type(input5), ([_4, input6]) => [[_0, _1, _2, _3, _4], input6]))))), ([_0, input2]) => [GenericParameterExtendsEqualsMapping(_0), input2]);
var GenericParameterExtends = (input) => If(If(Ident(input), ([_0, input2]) => If(Const("extends", input2), ([_1, input3]) => If(Type(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [GenericParameterExtendsMapping(_0), input2]);
var GenericParameterEquals = (input) => If(If(Ident(input), ([_0, input2]) => If(Const("=", input2), ([_1, input3]) => If(Type(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [GenericParameterEqualsMapping(_0), input2]);
var GenericParameterIdentifier = (input) => If(Ident(input), ([_0, input2]) => [GenericParameterIdentifierMapping(_0), input2]);
var GenericParameter = (input) => If(If(GenericParameterExtendsEquals(input), ([_0, input2]) => [_0, input2], () => If(GenericParameterExtends(input), ([_0, input2]) => [_0, input2], () => If(GenericParameterEquals(input), ([_0, input2]) => [_0, input2], () => If(GenericParameterIdentifier(input), ([_0, input2]) => [_0, input2], () => [])))), ([_0, input2]) => [GenericParameterMapping(_0), input2]);
var GenericParameterList_0 = (input, result = []) => If(If(GenericParameter(input), ([_0, input2]) => If(Const(",", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => GenericParameterList_0(input2, [...result, _0]), () => [result, input]);
var GenericParameterList = (input) => If(If(GenericParameterList_0(input), ([_0, input2]) => If(If(If(GenericParameter(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [GenericParameterListMapping(_0), input2]);
var GenericParameters = (input) => If(If(Const("<", input), ([_0, input2]) => If(GenericParameterList(input2), ([_1, input3]) => If(Const(">", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [GenericParametersMapping(_0), input2]);
var GenericCallArgumentList_0 = (input, result = []) => If(If(Type(input), ([_0, input2]) => If(Const(",", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => GenericCallArgumentList_0(input2, [...result, _0]), () => [result, input]);
var GenericCallArgumentList = (input) => If(If(GenericCallArgumentList_0(input), ([_0, input2]) => If(If(If(Type(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [GenericCallArgumentListMapping(_0), input2]);
var GenericCallArguments = (input) => If(If(Const("<", input), ([_0, input2]) => If(GenericCallArgumentList(input2), ([_1, input3]) => If(Const(">", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [GenericCallArgumentsMapping(_0), input2]);
var GenericCall = (input) => If(If(Ident(input), ([_0, input2]) => If(GenericCallArguments(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [GenericCallMapping(_0), input2]);
var OptionalSemiColon = (input) => If(If(If(Const(";", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [OptionalSemiColonMapping(_0), input2]);
var KeywordString = (input) => If(Const("string", input), ([_0, input2]) => [KeywordStringMapping(_0), input2]);
var KeywordNumber = (input) => If(Const("number", input), ([_0, input2]) => [KeywordNumberMapping(_0), input2]);
var KeywordBoolean = (input) => If(Const("boolean", input), ([_0, input2]) => [KeywordBooleanMapping(_0), input2]);
var KeywordUndefined = (input) => If(Const("undefined", input), ([_0, input2]) => [KeywordUndefinedMapping(_0), input2]);
var KeywordNull = (input) => If(Const("null", input), ([_0, input2]) => [KeywordNullMapping(_0), input2]);
var KeywordInteger = (input) => If(Const("integer", input), ([_0, input2]) => [KeywordIntegerMapping(_0), input2]);
var KeywordBigInt = (input) => If(Const("bigint", input), ([_0, input2]) => [KeywordBigIntMapping(_0), input2]);
var KeywordUnknown = (input) => If(Const("unknown", input), ([_0, input2]) => [KeywordUnknownMapping(_0), input2]);
var KeywordAny = (input) => If(Const("any", input), ([_0, input2]) => [KeywordAnyMapping(_0), input2]);
var KeywordObject = (input) => If(Const("object", input), ([_0, input2]) => [KeywordObjectMapping(_0), input2]);
var KeywordNever = (input) => If(Const("never", input), ([_0, input2]) => [KeywordNeverMapping(_0), input2]);
var KeywordSymbol = (input) => If(Const("symbol", input), ([_0, input2]) => [KeywordSymbolMapping(_0), input2]);
var KeywordVoid = (input) => If(Const("void", input), ([_0, input2]) => [KeywordVoidMapping(_0), input2]);
var KeywordThis = (input) => If(Const("this", input), ([_0, input2]) => [KeywordThisMapping(_0), input2]);
var Keyword = (input) => If(If(KeywordString(input), ([_0, input2]) => [_0, input2], () => If(KeywordNumber(input), ([_0, input2]) => [_0, input2], () => If(KeywordBoolean(input), ([_0, input2]) => [_0, input2], () => If(KeywordUndefined(input), ([_0, input2]) => [_0, input2], () => If(KeywordNull(input), ([_0, input2]) => [_0, input2], () => If(KeywordInteger(input), ([_0, input2]) => [_0, input2], () => If(KeywordBigInt(input), ([_0, input2]) => [_0, input2], () => If(KeywordUnknown(input), ([_0, input2]) => [_0, input2], () => If(KeywordAny(input), ([_0, input2]) => [_0, input2], () => If(KeywordObject(input), ([_0, input2]) => [_0, input2], () => If(KeywordNever(input), ([_0, input2]) => [_0, input2], () => If(KeywordSymbol(input), ([_0, input2]) => [_0, input2], () => If(KeywordVoid(input), ([_0, input2]) => [_0, input2], () => If(KeywordThis(input), ([_0, input2]) => [_0, input2], () => [])))))))))))))), ([_0, input2]) => [KeywordMapping(_0), input2]);
var TemplateInterpolate = (input) => If(If(Const("${", input), ([_0, input2]) => If(Type(input2), ([_1, input3]) => If(Const("}", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [TemplateInterpolateMapping(_0), input2]);
var TemplateSpan = (input) => If(Until(["${", "`"], input), ([_0, input2]) => [TemplateSpanMapping(_0), input2]);
var TemplateBody = (input) => If(If(If(TemplateSpan(input), ([_0, input2]) => If(TemplateInterpolate(input2), ([_1, input3]) => If(TemplateBody(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [_0, input2], () => If(If(TemplateSpan(input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If(If(TemplateSpan(input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => []))), ([_0, input2]) => [TemplateBodyMapping(_0), input2]);
var TemplateLiteralTypes = (input) => If(If(Const("`", input), ([_0, input2]) => If(TemplateBody(input2), ([_1, input3]) => If(Const("`", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [TemplateLiteralTypesMapping(_0), input2]);
var TemplateLiteral = (input) => If(TemplateLiteralTypes(input), ([_0, input2]) => [TemplateLiteralMapping(_0), input2]);
var LiteralBigInt = (input) => If(BigInt3(input), ([_0, input2]) => [LiteralBigIntMapping(_0), input2]);
var LiteralBoolean = (input) => If(If(Const("true", input), ([_0, input2]) => [_0, input2], () => If(Const("false", input), ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [LiteralBooleanMapping(_0), input2]);
var LiteralNumber = (input) => If(Number3(input), ([_0, input2]) => [LiteralNumberMapping(_0), input2]);
var LiteralString = (input) => If(String3(["'", '"'], input), ([_0, input2]) => [LiteralStringMapping(_0), input2]);
var Literal2 = (input) => If(If(LiteralBigInt(input), ([_0, input2]) => [_0, input2], () => If(LiteralBoolean(input), ([_0, input2]) => [_0, input2], () => If(LiteralNumber(input), ([_0, input2]) => [_0, input2], () => If(LiteralString(input), ([_0, input2]) => [_0, input2], () => [])))), ([_0, input2]) => [LiteralMapping(_0), input2]);
var KeyOf = (input) => If(If(If(Const("keyof", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [KeyOfMapping(_0), input2]);
var IndexArray_0 = (input, result = []) => If(If(If(Const("[", input), ([_0, input2]) => If(Type(input2), ([_1, input3]) => If(Const("]", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [_0, input2], () => If(If(Const("[", input), ([_0, input2]) => If(Const("]", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => IndexArray_0(input2, [...result, _0]), () => [result, input]);
var IndexArray = (input) => If(IndexArray_0(input), ([_0, input2]) => [IndexArrayMapping(_0), input2]);
var Extends = (input) => If(If(If(Const("extends", input), ([_0, input2]) => If(Type(input2), ([_1, input3]) => If(Const("?", input3), ([_2, input4]) => If(Type(input4), ([_3, input5]) => If(Const(":", input5), ([_4, input6]) => If(Type(input6), ([_5, input7]) => [[_0, _1, _2, _3, _4, _5], input7])))))), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [ExtendsMapping(_0), input2]);
var Base2 = (input) => If(If(If(Const("(", input), ([_0, input2]) => If(Type(input2), ([_1, input3]) => If(Const(")", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [_0, input2], () => If(Keyword(input), ([_0, input2]) => [_0, input2], () => If(_Object_2(input), ([_0, input2]) => [_0, input2], () => If(Tuple2(input), ([_0, input2]) => [_0, input2], () => If(TemplateLiteral(input), ([_0, input2]) => [_0, input2], () => If(Literal2(input), ([_0, input2]) => [_0, input2], () => If(Constructor2(input), ([_0, input2]) => [_0, input2], () => If(_Function_2(input), ([_0, input2]) => [_0, input2], () => If(Mapped(input), ([_0, input2]) => [_0, input2], () => If(Options(input), ([_0, input2]) => [_0, input2], () => If(GenericCall(input), ([_0, input2]) => [_0, input2], () => If(Reference(input), ([_0, input2]) => [_0, input2], () => [])))))))))))), ([_0, input2]) => [BaseMapping(_0), input2]);
var Factor = (input) => If(If(KeyOf(input), ([_0, input2]) => If(Base2(input2), ([_1, input3]) => If(IndexArray(input3), ([_2, input4]) => If(Extends(input4), ([_3, input5]) => [[_0, _1, _2, _3], input5])))), ([_0, input2]) => [FactorMapping(_0), input2]);
var ExprTermTail = (input) => If(If(If(Const("&", input), ([_0, input2]) => If(Factor(input2), ([_1, input3]) => If(ExprTermTail(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [ExprTermTailMapping(_0), input2]);
var ExprTerm = (input) => If(If(Factor(input), ([_0, input2]) => If(ExprTermTail(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ExprTermMapping(_0), input2]);
var ExprTail = (input) => If(If(If(Const("|", input), ([_0, input2]) => If(ExprTerm(input2), ([_1, input3]) => If(ExprTail(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [ExprTailMapping(_0), input2]);
var Expr = (input) => If(If(ExprTerm(input), ([_0, input2]) => If(ExprTail(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ExprMapping(_0), input2]);
var ExprReadonly = (input) => If(If(Const("readonly", input), ([_0, input2]) => If(Expr(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ExprReadonlyMapping(_0), input2]);
var ExprPipe = (input) => If(If(Const("|", input), ([_0, input2]) => If(Expr(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ExprPipeMapping(_0), input2]);
var GenericType = (input) => If(If(GenericParameters(input), ([_0, input2]) => If(Const("=", input2), ([_1, input3]) => If(Type(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [GenericTypeMapping(_0), input2]);
var InferType = (input) => If(If(If(Const("infer", input), ([_0, input2]) => If(Ident(input2), ([_1, input3]) => If(Const("extends", input3), ([_2, input4]) => If(Expr(input4), ([_3, input5]) => [[_0, _1, _2, _3], input5])))), ([_0, input2]) => [_0, input2], () => If(If(Const("infer", input), ([_0, input2]) => If(Ident(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [InferTypeMapping(_0), input2]);
var Type = (input) => If(If(InferType(input), ([_0, input2]) => [_0, input2], () => If(ExprPipe(input), ([_0, input2]) => [_0, input2], () => If(ExprReadonly(input), ([_0, input2]) => [_0, input2], () => If(Expr(input), ([_0, input2]) => [_0, input2], () => [])))), ([_0, input2]) => [TypeMapping(_0), input2]);
var PropertyKeyNumber = (input) => If(Number3(input), ([_0, input2]) => [PropertyKeyNumberMapping(_0), input2]);
var PropertyKeyIdent = (input) => If(Ident(input), ([_0, input2]) => [PropertyKeyIdentMapping(_0), input2]);
var PropertyKeyQuoted = (input) => If(String3(["'", '"'], input), ([_0, input2]) => [PropertyKeyQuotedMapping(_0), input2]);
var PropertyKeyIndex = (input) => If(If(Const("[", input), ([_0, input2]) => If(Ident(input2), ([_1, input3]) => If(Const(":", input3), ([_2, input4]) => If(If(KeywordInteger(input4), ([_02, input5]) => [_02, input5], () => If(KeywordNumber(input4), ([_02, input5]) => [_02, input5], () => If(KeywordString(input4), ([_02, input5]) => [_02, input5], () => If(KeywordSymbol(input4), ([_02, input5]) => [_02, input5], () => [])))), ([_3, input5]) => If(Const("]", input5), ([_4, input6]) => [[_0, _1, _2, _3, _4], input6]))))), ([_0, input2]) => [PropertyKeyIndexMapping(_0), input2]);
var PropertyKey = (input) => If(If(PropertyKeyNumber(input), ([_0, input2]) => [_0, input2], () => If(PropertyKeyIdent(input), ([_0, input2]) => [_0, input2], () => If(PropertyKeyQuoted(input), ([_0, input2]) => [_0, input2], () => If(PropertyKeyIndex(input), ([_0, input2]) => [_0, input2], () => [])))), ([_0, input2]) => [PropertyKeyMapping(_0), input2]);
var Readonly2 = (input) => If(If(If(Const("readonly", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [ReadonlyMapping(_0), input2]);
var Optional3 = (input) => If(If(If(Const("?", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [OptionalMapping(_0), input2]);
var Property = (input) => If(If(Readonly2(input), ([_0, input2]) => If(PropertyKey(input2), ([_1, input3]) => If(Optional3(input3), ([_2, input4]) => If(Const(":", input4), ([_3, input5]) => If(Type(input5), ([_4, input6]) => [[_0, _1, _2, _3, _4], input6]))))), ([_0, input2]) => [PropertyMapping(_0), input2]);
var PropertyDelimiter = (input) => If(If(If(Const(",", input), ([_0, input2]) => If(Const(`
`, input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If(If(Const(";", input), ([_0, input2]) => If(Const(`
`, input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If(If(Const(",", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If(If(Const(";", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If(If(Const(`
`, input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => []))))), ([_0, input2]) => [PropertyDelimiterMapping(_0), input2]);
var PropertyList_0 = (input, result = []) => If(If(Property(input), ([_0, input2]) => If(PropertyDelimiter(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => PropertyList_0(input2, [...result, _0]), () => [result, input]);
var PropertyList = (input) => If(If(PropertyList_0(input), ([_0, input2]) => If(If(If(Property(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [PropertyListMapping(_0), input2]);
var Properties = (input) => If(If(Const("{", input), ([_0, input2]) => If(PropertyList(input2), ([_1, input3]) => If(Const("}", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [PropertiesMapping(_0), input2]);
var _Object_2 = (input) => If(Properties(input), ([_0, input2]) => [_Object_Mapping(_0), input2]);
var ElementNamed = (input) => If(If(If(Ident(input), ([_0, input2]) => If(Const("?", input2), ([_1, input3]) => If(Const(":", input3), ([_2, input4]) => If(Const("readonly", input4), ([_3, input5]) => If(Type(input5), ([_4, input6]) => [[_0, _1, _2, _3, _4], input6]))))), ([_0, input2]) => [_0, input2], () => If(If(Ident(input), ([_0, input2]) => If(Const(":", input2), ([_1, input3]) => If(Const("readonly", input3), ([_2, input4]) => If(Type(input4), ([_3, input5]) => [[_0, _1, _2, _3], input5])))), ([_0, input2]) => [_0, input2], () => If(If(Ident(input), ([_0, input2]) => If(Const("?", input2), ([_1, input3]) => If(Const(":", input3), ([_2, input4]) => If(Type(input4), ([_3, input5]) => [[_0, _1, _2, _3], input5])))), ([_0, input2]) => [_0, input2], () => If(If(Ident(input), ([_0, input2]) => If(Const(":", input2), ([_1, input3]) => If(Type(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [_0, input2], () => [])))), ([_0, input2]) => [ElementNamedMapping(_0), input2]);
var ElementReadonlyOptional = (input) => If(If(Const("readonly", input), ([_0, input2]) => If(Type(input2), ([_1, input3]) => If(Const("?", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [ElementReadonlyOptionalMapping(_0), input2]);
var ElementReadonly = (input) => If(If(Const("readonly", input), ([_0, input2]) => If(Type(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ElementReadonlyMapping(_0), input2]);
var ElementOptional = (input) => If(If(Type(input), ([_0, input2]) => If(Const("?", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ElementOptionalMapping(_0), input2]);
var ElementBase = (input) => If(If(ElementNamed(input), ([_0, input2]) => [_0, input2], () => If(ElementReadonlyOptional(input), ([_0, input2]) => [_0, input2], () => If(ElementReadonly(input), ([_0, input2]) => [_0, input2], () => If(ElementOptional(input), ([_0, input2]) => [_0, input2], () => If(Type(input), ([_0, input2]) => [_0, input2], () => []))))), ([_0, input2]) => [ElementBaseMapping(_0), input2]);
var Element = (input) => If(If(If(Const("...", input), ([_0, input2]) => If(ElementBase(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If(If(ElementBase(input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [ElementMapping(_0), input2]);
var ElementList_0 = (input, result = []) => If(If(Element(input), ([_0, input2]) => If(Const(",", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => ElementList_0(input2, [...result, _0]), () => [result, input]);
var ElementList = (input) => If(If(ElementList_0(input), ([_0, input2]) => If(If(If(Element(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ElementListMapping(_0), input2]);
var Tuple2 = (input) => If(If(Const("[", input), ([_0, input2]) => If(ElementList(input2), ([_1, input3]) => If(Const("]", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [TupleMapping(_0), input2]);
var ParameterReadonlyOptional = (input) => If(If(Ident(input), ([_0, input2]) => If(Const("?", input2), ([_1, input3]) => If(Const(":", input3), ([_2, input4]) => If(Const("readonly", input4), ([_3, input5]) => If(Type(input5), ([_4, input6]) => [[_0, _1, _2, _3, _4], input6]))))), ([_0, input2]) => [ParameterReadonlyOptionalMapping(_0), input2]);
var ParameterReadonly = (input) => If(If(Ident(input), ([_0, input2]) => If(Const(":", input2), ([_1, input3]) => If(Const("readonly", input3), ([_2, input4]) => If(Type(input4), ([_3, input5]) => [[_0, _1, _2, _3], input5])))), ([_0, input2]) => [ParameterReadonlyMapping(_0), input2]);
var ParameterOptional = (input) => If(If(Ident(input), ([_0, input2]) => If(Const("?", input2), ([_1, input3]) => If(Const(":", input3), ([_2, input4]) => If(Type(input4), ([_3, input5]) => [[_0, _1, _2, _3], input5])))), ([_0, input2]) => [ParameterOptionalMapping(_0), input2]);
var ParameterType = (input) => If(If(Ident(input), ([_0, input2]) => If(Const(":", input2), ([_1, input3]) => If(Type(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [ParameterTypeMapping(_0), input2]);
var ParameterBase = (input) => If(If(ParameterReadonlyOptional(input), ([_0, input2]) => [_0, input2], () => If(ParameterReadonly(input), ([_0, input2]) => [_0, input2], () => If(ParameterOptional(input), ([_0, input2]) => [_0, input2], () => If(ParameterType(input), ([_0, input2]) => [_0, input2], () => [])))), ([_0, input2]) => [ParameterBaseMapping(_0), input2]);
var Parameter2 = (input) => If(If(If(Const("...", input), ([_0, input2]) => If(ParameterBase(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If(If(ParameterBase(input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [ParameterMapping(_0), input2]);
var ParameterList_0 = (input, result = []) => If(If(Parameter2(input), ([_0, input2]) => If(Const(",", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => ParameterList_0(input2, [...result, _0]), () => [result, input]);
var ParameterList = (input) => If(If(ParameterList_0(input), ([_0, input2]) => If(If(If(Parameter2(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ParameterListMapping(_0), input2]);
var _Function_2 = (input) => If(If(Const("(", input), ([_0, input2]) => If(ParameterList(input2), ([_1, input3]) => If(Const(")", input3), ([_2, input4]) => If(Const("=>", input4), ([_3, input5]) => If(Type(input5), ([_4, input6]) => [[_0, _1, _2, _3, _4], input6]))))), ([_0, input2]) => [_Function_Mapping(_0), input2]);
var Constructor2 = (input) => If(If(Const("new", input), ([_0, input2]) => If(Const("(", input2), ([_1, input3]) => If(ParameterList(input3), ([_2, input4]) => If(Const(")", input4), ([_3, input5]) => If(Const("=>", input5), ([_4, input6]) => If(Type(input6), ([_5, input7]) => [[_0, _1, _2, _3, _4, _5], input7])))))), ([_0, input2]) => [ConstructorMapping(_0), input2]);
var MappedReadonly = (input) => If(If(If(Const("+", input), ([_0, input2]) => If(Const("readonly", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If(If(Const("-", input), ([_0, input2]) => If(Const("readonly", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If(If(Const("readonly", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])))), ([_0, input2]) => [MappedReadonlyMapping(_0), input2]);
var MappedOptional = (input) => If(If(If(Const("+", input), ([_0, input2]) => If(Const("?", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If(If(Const("-", input), ([_0, input2]) => If(Const("?", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If(If(Const("?", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])))), ([_0, input2]) => [MappedOptionalMapping(_0), input2]);
var MappedAs = (input) => If(If(If(Const("as", input), ([_0, input2]) => If(Type(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [MappedAsMapping(_0), input2]);
var Mapped = (input) => If(If(Const("{", input), ([_0, input2]) => If(MappedReadonly(input2), ([_1, input3]) => If(Const("[", input3), ([_2, input4]) => If(Ident(input4), ([_3, input5]) => If(Const("in", input5), ([_4, input6]) => If(Type(input6), ([_5, input7]) => If(MappedAs(input7), ([_6, input8]) => If(Const("]", input8), ([_7, input9]) => If(MappedOptional(input9), ([_8, input10]) => If(Const(":", input10), ([_9, input11]) => If(Type(input11), ([_10, input12]) => If(OptionalSemiColon(input12), ([_11, input13]) => If(Const("}", input13), ([_12, input14]) => [[_0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12], input14]))))))))))))), ([_0, input2]) => [MappedMapping(_0), input2]);
var Reference = (input) => If(Ident(input), ([_0, input2]) => [ReferenceMapping(_0), input2]);
var Options = (input) => If(If(Const("Options", input), ([_0, input2]) => If(Const("<", input2), ([_1, input3]) => If(Type(input3), ([_2, input4]) => If(Const(",", input4), ([_3, input5]) => If(JsonObject(input5), ([_4, input6]) => If(Const(">", input6), ([_5, input7]) => [[_0, _1, _2, _3, _4, _5], input7])))))), ([_0, input2]) => [OptionsMapping(_0), input2]);
var JsonNumber = (input) => If(Number3(input), ([_0, input2]) => [JsonNumberMapping(_0), input2]);
var JsonBoolean = (input) => If(If(Const("true", input), ([_0, input2]) => [_0, input2], () => If(Const("false", input), ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [JsonBooleanMapping(_0), input2]);
var JsonString = (input) => If(String3(['"', "'"], input), ([_0, input2]) => [JsonStringMapping(_0), input2]);
var JsonNull = (input) => If(Const("null", input), ([_0, input2]) => [JsonNullMapping(_0), input2]);
var JsonProperty = (input) => If(If(PropertyKey(input), ([_0, input2]) => If(Const(":", input2), ([_1, input3]) => If(Json(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [JsonPropertyMapping(_0), input2]);
var JsonPropertyList_0 = (input, result = []) => If(If(JsonProperty(input), ([_0, input2]) => If(PropertyDelimiter(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => JsonPropertyList_0(input2, [...result, _0]), () => [result, input]);
var JsonPropertyList = (input) => If(If(JsonPropertyList_0(input), ([_0, input2]) => If(If(If(JsonProperty(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [JsonPropertyListMapping(_0), input2]);
var JsonObject = (input) => If(If(Const("{", input), ([_0, input2]) => If(JsonPropertyList(input2), ([_1, input3]) => If(Const("}", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [JsonObjectMapping(_0), input2]);
var JsonElementList_0 = (input, result = []) => If(If(Json(input), ([_0, input2]) => If(Const(",", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => JsonElementList_0(input2, [...result, _0]), () => [result, input]);
var JsonElementList = (input) => If(If(JsonElementList_0(input), ([_0, input2]) => If(If(If(Json(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [JsonElementListMapping(_0), input2]);
var JsonArray = (input) => If(If(Const("[", input), ([_0, input2]) => If(JsonElementList(input2), ([_1, input3]) => If(Const("]", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [JsonArrayMapping(_0), input2]);
var Json = (input) => If(If(JsonNumber(input), ([_0, input2]) => [_0, input2], () => If(JsonBoolean(input), ([_0, input2]) => [_0, input2], () => If(JsonString(input), ([_0, input2]) => [_0, input2], () => If(JsonNull(input), ([_0, input2]) => [_0, input2], () => If(JsonObject(input), ([_0, input2]) => [_0, input2], () => If(JsonArray(input), ([_0, input2]) => [_0, input2], () => [])))))), ([_0, input2]) => [JsonMapping(_0), input2]);
var PatternBigInt = (input) => If(Const("-?(?:0|[1-9][0-9]*)n", input), ([_0, input2]) => [PatternBigIntMapping(_0), input2]);
var PatternString = (input) => If(Const(".*", input), ([_0, input2]) => [PatternStringMapping(_0), input2]);
var PatternNumber = (input) => If(Const("-?(?:0|[1-9][0-9]*)(?:.[0-9]+)?", input), ([_0, input2]) => [PatternNumberMapping(_0), input2]);
var PatternInteger = (input) => If(Const("-?(?:0|[1-9][0-9]*)", input), ([_0, input2]) => [PatternIntegerMapping(_0), input2]);
var PatternNever = (input) => If(Const("(?!)", input), ([_0, input2]) => [PatternNeverMapping(_0), input2]);
var PatternText = (input) => If(Until_1(["-?(?:0|[1-9][0-9]*)n", ".*", "-?(?:0|[1-9][0-9]*)(?:.[0-9]+)?", "-?(?:0|[1-9][0-9]*)", "(?!)", "(", ")", "$", "|"], input), ([_0, input2]) => [PatternTextMapping(_0), input2]);
var PatternBase = (input) => If(If(PatternBigInt(input), ([_0, input2]) => [_0, input2], () => If(PatternString(input), ([_0, input2]) => [_0, input2], () => If(PatternNumber(input), ([_0, input2]) => [_0, input2], () => If(PatternInteger(input), ([_0, input2]) => [_0, input2], () => If(PatternNever(input), ([_0, input2]) => [_0, input2], () => If(PatternGroup(input), ([_0, input2]) => [_0, input2], () => If(PatternText(input), ([_0, input2]) => [_0, input2], () => []))))))), ([_0, input2]) => [PatternBaseMapping(_0), input2]);
var PatternGroup = (input) => If(If(Const("(", input), ([_0, input2]) => If(PatternBody(input2), ([_1, input3]) => If(Const(")", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [PatternGroupMapping(_0), input2]);
var PatternUnion = (input) => If(If(If(PatternTerm(input), ([_0, input2]) => If(Const("|", input2), ([_1, input3]) => If(PatternUnion(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [_0, input2], () => If(If(PatternTerm(input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => []))), ([_0, input2]) => [PatternUnionMapping(_0), input2]);
var PatternTerm = (input) => If(If(PatternBase(input), ([_0, input2]) => If(PatternBody(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [PatternTermMapping(_0), input2]);
var PatternBody = (input) => If(If(PatternUnion(input), ([_0, input2]) => [_0, input2], () => If(PatternTerm(input), ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [PatternBodyMapping(_0), input2]);
var Pattern = (input) => If(If(Const("^", input), ([_0, input2]) => If(PatternBody(input2), ([_1, input3]) => If(Const("$", input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [PatternMapping(_0), input2]);
var InterfaceDeclarationHeritageList_0 = (input, result = []) => If(If(Type(input), ([_0, input2]) => If(Const(",", input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => InterfaceDeclarationHeritageList_0(input2, [...result, _0]), () => [result, input]);
var InterfaceDeclarationHeritageList = (input) => If(If(InterfaceDeclarationHeritageList_0(input), ([_0, input2]) => If(If(If(Type(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [InterfaceDeclarationHeritageListMapping(_0), input2]);
var InterfaceDeclarationHeritage = (input) => If(If(If(Const("extends", input), ([_0, input2]) => If(InterfaceDeclarationHeritageList(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [InterfaceDeclarationHeritageMapping(_0), input2]);
var InterfaceDeclarationGeneric = (input) => If(If(Const("interface", input), ([_0, input2]) => If(Ident(input2), ([_1, input3]) => If(GenericParameters(input3), ([_2, input4]) => If(InterfaceDeclarationHeritage(input4), ([_3, input5]) => If(Properties(input5), ([_4, input6]) => [[_0, _1, _2, _3, _4], input6]))))), ([_0, input2]) => [InterfaceDeclarationGenericMapping(_0), input2]);
var InterfaceDeclaration = (input) => If(If(Const("interface", input), ([_0, input2]) => If(Ident(input2), ([_1, input3]) => If(InterfaceDeclarationHeritage(input3), ([_2, input4]) => If(Properties(input4), ([_3, input5]) => [[_0, _1, _2, _3], input5])))), ([_0, input2]) => [InterfaceDeclarationMapping(_0), input2]);
var TypeAliasDeclarationGeneric = (input) => If(If(Const("type", input), ([_0, input2]) => If(Ident(input2), ([_1, input3]) => If(GenericParameters(input3), ([_2, input4]) => If(Const("=", input4), ([_3, input5]) => If(Type(input5), ([_4, input6]) => [[_0, _1, _2, _3, _4], input6]))))), ([_0, input2]) => [TypeAliasDeclarationGenericMapping(_0), input2]);
var TypeAliasDeclaration = (input) => If(If(Const("type", input), ([_0, input2]) => If(Ident(input2), ([_1, input3]) => If(Const("=", input3), ([_2, input4]) => If(Type(input4), ([_3, input5]) => [[_0, _1, _2, _3], input5])))), ([_0, input2]) => [TypeAliasDeclarationMapping(_0), input2]);
var ExportKeyword = (input) => If(If(If(Const("export", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If([[], input], ([_0, input2]) => [_0, input2], () => [])), ([_0, input2]) => [ExportKeywordMapping(_0), input2]);
var ModuleDeclarationDelimiter = (input) => If(If(If(Const(";", input), ([_0, input2]) => If(Const(`
`, input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [_0, input2], () => If(If(Const(";", input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => If(If(Const(`
`, input), ([_0, input2]) => [[_0], input2]), ([_0, input2]) => [_0, input2], () => []))), ([_0, input2]) => [ModuleDeclarationDelimiterMapping(_0), input2]);
var ModuleDeclarationList_0 = (input, result = []) => If(If(ModuleDeclaration(input), ([_0, input2]) => If(ModuleDeclarationDelimiter(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => ModuleDeclarationList_0(input2, [...result, _0]), () => [result, input]);
var ModuleDeclarationList = (input) => If(If(ModuleDeclarationList_0(input), ([_0, input2]) => If(If(If(ModuleDeclaration(input2), ([_02, input3]) => [[_02], input3]), ([_02, input3]) => [_02, input3], () => If([[], input2], ([_02, input3]) => [_02, input3], () => [])), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ModuleDeclarationListMapping(_0), input2]);
var ModuleDeclaration = (input) => If(If(ExportKeyword(input), ([_0, input2]) => If(If(InterfaceDeclarationGeneric(input2), ([_02, input3]) => [_02, input3], () => If(InterfaceDeclaration(input2), ([_02, input3]) => [_02, input3], () => If(TypeAliasDeclarationGeneric(input2), ([_02, input3]) => [_02, input3], () => If(TypeAliasDeclaration(input2), ([_02, input3]) => [_02, input3], () => [])))), ([_1, input3]) => If(OptionalSemiColon(input3), ([_2, input4]) => [[_0, _1, _2], input4]))), ([_0, input2]) => [ModuleDeclarationMapping(_0), input2]);
var Module = (input) => If(If(ModuleDeclaration(input), ([_0, input2]) => If(ModuleDeclarationList(input2), ([_1, input3]) => [[_0, _1], input3])), ([_0, input2]) => [ModuleMapping(_0), input2]);
var Script = (input) => If(If(Module(input), ([_0, input2]) => [_0, input2], () => If(GenericType(input), ([_0, input2]) => [_0, input2], () => If(Type(input), ([_0, input2]) => [_0, input2], () => []))), ([_0, input2]) => [ScriptMapping(_0), input2]);

// node_modules/typebox/build/type/engine/patterns/template.mjs
function ParseTemplateIntoTypes(template) {
  const parsed = TemplateLiteralTypes(`\`${template}\``);
  const result = exports_guard.IsEqual(parsed.length, 2) ? parsed[0] : Unreachable();
  return result;
}

// node_modules/typebox/build/type/engine/template_literal/encode.mjs
function JoinString(input) {
  return input.join("|");
}
function UnwrapTemplateLiteralPattern(pattern) {
  return pattern.slice(1, pattern.length - 1);
}
function EncodeLiteral(value, right, pattern) {
  return EncodeTypes(right, `${pattern}${value}`);
}
function EncodeBigInt(right, pattern) {
  return EncodeTypes(right, `${pattern}${BigIntPattern}`);
}
function EncodeInteger(right, pattern) {
  return EncodeTypes(right, `${pattern}${IntegerPattern}`);
}
function EncodeNumber(right, pattern) {
  return EncodeTypes(right, `${pattern}${NumberPattern}`);
}
function EncodeBoolean(right, pattern) {
  return EncodeType(Union([Literal("false"), Literal("true")]), right, pattern);
}
function EncodeString(right, pattern) {
  return EncodeTypes(right, `${pattern}${StringPattern}`);
}
function EncodeTemplateLiteral(templatePattern, right, pattern) {
  return EncodeTypes(right, `${pattern}${UnwrapTemplateLiteralPattern(templatePattern)}`);
}
function EncodeTemplateLiteralDeferred(types, right, pattern) {
  const templateLiteral = TemplateLiteralAction(types, {});
  const result = EncodeType(templateLiteral, right, pattern);
  return result;
}
function EncodeEnum(types, right, pattern) {
  const variants = EnumValuesToVariants(types);
  return EncodeUnion(variants, right, pattern);
}
function EncodeUnion(types, right, pattern, result = []) {
  return exports_guard.TakeLeft(types, (head, tail) => EncodeUnion(tail, right, pattern, [...result, EncodeType(head, [], "")]), () => EncodeTypes(right, `${pattern}(${JoinString(result)})`));
}
function EncodeType(type, right, pattern) {
  return IsEnum(type) ? EncodeEnum(type.enum, right, pattern) : IsInteger2(type) ? EncodeInteger(right, pattern) : IsLiteral(type) ? EncodeLiteral(type.const, right, pattern) : IsBigInt2(type) ? EncodeBigInt(right, pattern) : IsBoolean2(type) ? EncodeBoolean(right, pattern) : IsNumber2(type) ? EncodeNumber(right, pattern) : IsString2(type) ? EncodeString(right, pattern) : IsTemplateLiteral(type) ? EncodeTemplateLiteral(type.pattern, right, pattern) : IsTemplateLiteralDeferred(type) ? EncodeTemplateLiteralDeferred(type.parameters[0], right, pattern) : IsUnion(type) ? EncodeUnion(type.anyOf, right, pattern) : NeverPattern;
}
function EncodeTypes(types, pattern) {
  return exports_guard.TakeLeft(types, (left, right) => EncodeType(left, right, pattern), () => pattern);
}
function EncodePattern(types) {
  const encoded = EncodeTypes(types, "");
  const result = `^${encoded}$`;
  return result;
}
function TemplateLiteralEncode(types) {
  const pattern = EncodePattern(types);
  const result = TemplateLiteralCreate(pattern);
  return result;
}

// node_modules/typebox/build/type/engine/template_literal/instantiate.mjs
function TemplateLiteralAction(types, options) {
  const result = CanInstantiate(types) ? exports_memory.Update(TemplateLiteralEncode(types), {}, options) : TemplateLiteralDeferred(types, options);
  return result;
}
function TemplateLiteralInstantiate(context, state, types, options) {
  const instantiatedTypes = InstantiateTypes(context, state, types);
  return TemplateLiteralAction(instantiatedTypes, options);
}

// node_modules/typebox/build/type/types/template_literal.mjs
function TemplateLiteralDeferred(types, options = {}) {
  return Deferred("TemplateLiteral", [types], options);
}
function IsTemplateLiteralDeferred(value) {
  return IsSchema(value) && exports_guard.HasPropertyKey(value, "action") && exports_guard.IsEqual(value.action, "TemplateLiteral");
}
function TemplateLiteralFromTypes(types) {
  return TemplateLiteralAction(types, {});
}
function TemplateLiteralFromString(template) {
  const types = ParseTemplateIntoTypes(template);
  return TemplateLiteralFromTypes(types);
}
function TemplateLiteral2(input, options = {}) {
  const type = exports_guard.IsString(input) ? TemplateLiteralFromString(input) : TemplateLiteralFromTypes(input);
  return exports_memory.Update(type, {}, options);
}
function IsTemplateLiteral(value) {
  return IsKind(value, "TemplateLiteral");
}

// node_modules/typebox/build/type/extends/result.mjs
var exports_result = {};
__export(exports_result, {
  Match: () => Match3,
  IsExtendsUnion: () => IsExtendsUnion,
  IsExtendsTrueLike: () => IsExtendsTrueLike,
  IsExtendsTrue: () => IsExtendsTrue,
  IsExtendsFalse: () => IsExtendsFalse,
  ExtendsUnion: () => ExtendsUnion,
  ExtendsTrue: () => ExtendsTrue,
  ExtendsFalse: () => ExtendsFalse
});
function ExtendsUnion(inferred) {
  return exports_memory.Create({ ["~kind"]: "ExtendsUnion" }, { inferred });
}
function IsExtendsUnion(value) {
  return exports_guard.IsObject(value) && exports_guard.HasPropertyKey(value, "~kind") && exports_guard.HasPropertyKey(value, "inferred") && exports_guard.IsEqual(value["~kind"], "ExtendsUnion") && exports_guard.IsObject(value.inferred);
}
function ExtendsTrue(inferred) {
  return exports_memory.Create({ ["~kind"]: "ExtendsTrue" }, { inferred });
}
function IsExtendsTrue(value) {
  return exports_guard.IsObject(value) && exports_guard.HasPropertyKey(value, "~kind") && exports_guard.HasPropertyKey(value, "inferred") && exports_guard.IsEqual(value["~kind"], "ExtendsTrue") && exports_guard.IsObject(value.inferred);
}
function ExtendsFalse() {
  return exports_memory.Create({ ["~kind"]: "ExtendsFalse" }, {});
}
function IsExtendsFalse(value) {
  return exports_guard.IsObject(value) && exports_guard.HasPropertyKey(value, "~kind") && exports_guard.IsEqual(value["~kind"], "ExtendsFalse");
}
function IsExtendsTrueLike(value) {
  return IsExtendsUnion(value) || IsExtendsTrue(value);
}
function Match3(result, true_, false_) {
  return IsExtendsTrueLike(result) ? true_(result.inferred) : false_();
}
// node_modules/typebox/build/type/extends/extends_right.mjs
function ExtendsRightInfer(inferred, name, left, right) {
  return Match3(ExtendsLeft(inferred, left, right), (checkInferred) => ExtendsTrue(exports_memory.Assign(exports_memory.Assign(inferred, checkInferred), { [name]: left })), () => ExtendsFalse());
}
function ExtendsRightAny(inferred, _left) {
  return ExtendsTrue(inferred);
}
function ExtendsRightEnum(inferred, left, right) {
  const union2 = EnumValuesToUnion(right);
  return ExtendsLeft(inferred, left, union2);
}
function ExtendsRightIntersect(inferred, left, right) {
  return exports_guard.TakeLeft(right, (head, tail) => Match3(ExtendsLeft(inferred, left, head), (inferred2) => ExtendsRightIntersect(inferred2, left, tail), () => ExtendsFalse()), () => ExtendsTrue(inferred));
}
function ExtendsRightTemplateLiteral(inferred, left, right) {
  const decoded = TemplateLiteralDecode(right);
  return ExtendsLeft(inferred, left, decoded);
}
function ExtendsRightUnion(inferred, left, right) {
  return exports_guard.TakeLeft(right, (head, tail) => Match3(ExtendsLeft(inferred, left, head), (inferred2) => ExtendsTrue(inferred2), () => ExtendsRightUnion(inferred, left, tail)), () => ExtendsFalse());
}
function ExtendsRight(inferred, left, right) {
  return IsAny(right) ? ExtendsRightAny(inferred, left) : IsEnum(right) ? ExtendsRightEnum(inferred, left, right.enum) : IsInfer(right) ? ExtendsRightInfer(inferred, right.name, left, right.extends) : IsIntersect(right) ? ExtendsRightIntersect(inferred, left, right.allOf) : IsTemplateLiteral(right) ? ExtendsRightTemplateLiteral(inferred, left, right.pattern) : IsUnion(right) ? ExtendsRightUnion(inferred, left, right.anyOf) : IsUnknown(right) ? ExtendsTrue(inferred) : ExtendsFalse();
}

// node_modules/typebox/build/type/extends/any.mjs
function ExtendsAny(inferred, left, right) {
  return IsInfer(right) ? ExtendsRight(inferred, left, right) : IsAny(right) ? ExtendsTrue(inferred) : IsUnknown(right) ? ExtendsTrue(inferred) : ExtendsUnion(inferred);
}

// node_modules/typebox/build/type/extends/array.mjs
function ExtendsImmutable(left, right) {
  const isImmutableLeft = IsImmutable(left);
  const isImmutableRight = IsImmutable(right);
  return isImmutableLeft && isImmutableRight ? true : !isImmutableLeft && isImmutableRight ? true : isImmutableLeft && !isImmutableRight ? false : true;
}
function ExtendsArray(inferred, arrayLeft, left, right) {
  return IsArray2(right) ? ExtendsImmutable(arrayLeft, right) ? ExtendsLeft(inferred, left, right.items) : ExtendsFalse() : ExtendsRight(inferred, arrayLeft, right);
}

// node_modules/typebox/build/type/extends/async_iterator.mjs
function ExtendsAsyncIterator(inferred, left, right) {
  return IsAsyncIterator2(right) ? ExtendsLeft(inferred, left, right.iteratorItems) : ExtendsRight(inferred, AsyncIterator(left), right);
}

// node_modules/typebox/build/type/extends/bigint.mjs
function ExtendsBigInt(inferred, left, right) {
  return IsBigInt2(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
}

// node_modules/typebox/build/type/extends/boolean.mjs
function ExtendsBoolean(inferred, left, right) {
  return IsBoolean2(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
}

// node_modules/typebox/build/type/extends/parameters.mjs
function ParameterCompare(inferred, left, leftRest, right, rightRest) {
  const checkLeft = IsInfer(right) ? left : right;
  const checkRight = IsInfer(right) ? right : left;
  const isLeftOptional = IsOptional(left);
  const isRightOptional = IsOptional(right);
  return !isLeftOptional && isRightOptional ? ExtendsFalse() : Match3(ExtendsLeft(inferred, checkLeft, checkRight), (inferred2) => ExtendsParameters(inferred2, leftRest, rightRest), () => ExtendsFalse());
}
function ParameterRight(inferred, left, leftRest, rightRest) {
  return exports_guard.TakeLeft(rightRest, (head, tail) => ParameterCompare(inferred, left, leftRest, head, tail), () => IsOptional(left) ? ExtendsTrue(inferred) : ExtendsFalse());
}
function ParametersLeft(inferred, left, rightRest) {
  return exports_guard.TakeLeft(left, (head, tail) => ParameterRight(inferred, head, tail, rightRest), () => ExtendsTrue(inferred));
}
function ExtendsParameters(inferred, left, right) {
  return ParametersLeft(inferred, left, right);
}

// node_modules/typebox/build/type/extends/return_type.mjs
function ExtendsReturnType(inferred, left, right) {
  return IsVoid(right) ? ExtendsTrue(inferred) : ExtendsLeft(inferred, left, right);
}

// node_modules/typebox/build/type/extends/constructor.mjs
function ExtendsConstructor(inferred, parameters, returnType, right) {
  return IsAny(right) ? ExtendsTrue(inferred) : IsUnknown(right) ? ExtendsTrue(inferred) : IsConstructor2(right) ? Match3(ExtendsParameters(inferred, parameters, right["parameters"]), (inferred2) => ExtendsReturnType(inferred2, returnType, right["instanceType"]), () => ExtendsFalse()) : ExtendsFalse();
}

// node_modules/typebox/build/type/extends/enum.mjs
function ExtendsEnum(inferred, left, right) {
  return ExtendsLeft(inferred, EnumToUnion(left), right);
}

// node_modules/typebox/build/type/extends/function.mjs
function ExtendsFunction(inferred, parameters, returnType, right) {
  return IsAny(right) ? ExtendsTrue(inferred) : IsUnknown(right) ? ExtendsTrue(inferred) : IsFunction2(right) ? Match3(ExtendsParameters(inferred, parameters, right["parameters"]), (inferred2) => ExtendsReturnType(inferred2, returnType, right["returnType"]), () => ExtendsFalse()) : ExtendsFalse();
}

// node_modules/typebox/build/type/extends/integer.mjs
function ExtendsInteger(inferred, left, right) {
  return IsInteger2(right) ? ExtendsTrue(inferred) : IsNumber2(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
}

// node_modules/typebox/build/type/extends/intersect.mjs
function ExtendsIntersect(inferred, left, right) {
  const evaluated = EvaluateIntersect(left);
  return ExtendsLeft(inferred, evaluated, right);
}

// node_modules/typebox/build/type/extends/iterator.mjs
function ExtendsIterator(inferred, left, right) {
  return IsIterator2(right) ? ExtendsLeft(inferred, left, right.iteratorItems) : ExtendsRight(inferred, Iterator(left), right);
}

// node_modules/typebox/build/type/extends/literal.mjs
function ExtendsLiteralValue(inferred, left, right) {
  return left === right ? ExtendsTrue(inferred) : ExtendsFalse();
}
function ExtendsLiteralBigInt(inferred, left, right) {
  return IsLiteral(right) ? ExtendsLiteralValue(inferred, left, right.const) : IsBigInt2(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, Literal(left), right);
}
function ExtendsLiteralBoolean(inferred, left, right) {
  return IsLiteral(right) ? ExtendsLiteralValue(inferred, left, right.const) : IsBoolean2(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, Literal(left), right);
}
function ExtendsLiteralNumber(inferred, left, right) {
  return IsLiteral(right) ? ExtendsLiteralValue(inferred, left, right.const) : IsNumber2(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, Literal(left), right);
}
function ExtendsLiteralString(inferred, left, right) {
  return IsLiteral(right) ? ExtendsLiteralValue(inferred, left, right.const) : IsString2(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, Literal(left), right);
}
function ExtendsLiteral(inferred, left, right) {
  return exports_guard.IsBigInt(left.const) ? ExtendsLiteralBigInt(inferred, left.const, right) : exports_guard.IsBoolean(left.const) ? ExtendsLiteralBoolean(inferred, left.const, right) : exports_guard.IsNumber(left.const) ? ExtendsLiteralNumber(inferred, left.const, right) : exports_guard.IsString(left.const) ? ExtendsLiteralString(inferred, left.const, right) : Unreachable();
}

// node_modules/typebox/build/type/extends/never.mjs
function ExtendsNever(inferred, left, right) {
  return IsInfer(right) ? ExtendsRight(inferred, left, right) : ExtendsTrue(inferred);
}

// node_modules/typebox/build/type/extends/null.mjs
function ExtendsNull(inferred, left, right) {
  return IsNull2(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
}

// node_modules/typebox/build/type/extends/number.mjs
function ExtendsNumber(inferred, left, right) {
  return IsNumber2(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
}

// node_modules/typebox/build/type/extends/object.mjs
function ExtendsPropertyOptional(inferred, left, right) {
  return IsOptional(left) ? IsOptional(right) ? ExtendsTrue(inferred) : ExtendsFalse() : ExtendsTrue(inferred);
}
function ExtendsProperty(inferred, left, right) {
  return IsInfer(right) && IsNever(right.extends) ? ExtendsFalse() : Match3(ExtendsLeft(inferred, left, right), (inferred2) => ExtendsPropertyOptional(inferred2, left, right), () => ExtendsFalse());
}
function ExtractInferredProperties(keys, properties2) {
  return keys.reduce((result, key) => {
    return key in properties2 ? IsExtendsTrueLike(properties2[key]) ? { ...result, ...properties2[key].inferred } : Unreachable() : Unreachable();
  }, {});
}
function ExtendsPropertiesComparer(inferred, left, right) {
  const properties2 = {};
  for (const rightKey of exports_guard.Keys(right)) {
    properties2[rightKey] = rightKey in left ? ExtendsProperty({}, left[rightKey], right[rightKey]) : IsOptional(right[rightKey]) ? IsInfer(right[rightKey]) ? ExtendsTrue(exports_memory.Assign(inferred, { [right[rightKey].name]: right[rightKey].extends })) : ExtendsTrue(inferred) : ExtendsFalse();
  }
  const checked = exports_guard.Values(properties2).every((result) => IsExtendsTrueLike(result));
  const extracted = checked ? ExtractInferredProperties(exports_guard.Keys(properties2), properties2) : {};
  return checked ? ExtendsTrue(extracted) : ExtendsFalse();
}
function ExtendsProperties(inferred, left, right) {
  const compared = ExtendsPropertiesComparer(inferred, left, right);
  return IsExtendsTrueLike(compared) ? ExtendsTrue(exports_memory.Assign(inferred, compared.inferred)) : ExtendsFalse();
}
function ExtendsObjectToObject(inferred, left, right) {
  return ExtendsProperties(inferred, left, right);
}
function ExtendsObject(inferred, left, right) {
  return IsObject2(right) ? ExtendsObjectToObject(inferred, left, right.properties) : ExtendsRight(inferred, _Object_(left), right);
}

// node_modules/typebox/build/type/extends/promise.mjs
function ExtendsPromise(inferred, left, right) {
  return IsPromise(right) ? ExtendsLeft(inferred, left, right.item) : ExtendsRight(inferred, _Promise_(left), right);
}

// node_modules/typebox/build/type/extends/string.mjs
function ExtendsString(inferred, left, right) {
  return IsString2(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
}

// node_modules/typebox/build/type/extends/symbol.mjs
function ExtendsSymbol(inferred, left, right) {
  return IsSymbol2(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
}

// node_modules/typebox/build/type/extends/template_literal.mjs
function ExtendsTemplateLiteral(inferred, left, right) {
  const decoded = TemplateLiteralDecode(left);
  return ExtendsLeft(inferred, decoded, right);
}

// node_modules/typebox/build/type/extends/inference.mjs
function Inferrable(name, type) {
  return exports_memory.Create({ "~kind": "Inferrable" }, { name, type }, {});
}
function IsInferable(value) {
  return exports_guard.IsObject(value) && exports_guard.HasPropertyKey(value, "~kind") && exports_guard.HasPropertyKey(value, "name") && exports_guard.HasPropertyKey(value, "type") && exports_guard.IsEqual(value["~kind"], "Inferrable") && exports_guard.IsString(value.name) && exports_guard.IsObject(value.type);
}
function TryRestInferable(type) {
  return IsRest(type) ? IsInfer(type.items) ? IsArray2(type.items.extends) ? Inferrable(type.items.name, type.items.extends.items) : IsUnknown(type.items.extends) ? Inferrable(type.items.name, type.items.extends) : undefined : Unreachable() : undefined;
}
function TryInferable(type) {
  return IsInfer(type) ? Inferrable(type.name, type.extends) : undefined;
}
function TryInferResults(rest3, right, result = []) {
  return exports_guard.TakeLeft(rest3, (head, tail) => Match3(ExtendsLeft({}, head, right), () => TryInferResults(tail, right, [...result, head]), () => {
    return;
  }), () => result);
}
function InferTupleResult(inferred, name, left, right) {
  const results = TryInferResults(left, right);
  return exports_guard.IsArray(results) ? ExtendsTrue(exports_memory.Assign(inferred, { [name]: Tuple(results) })) : ExtendsFalse();
}
function InferUnionResult(inferred, name, left, right) {
  const results = TryInferResults(left, right);
  return exports_guard.IsArray(results) ? ExtendsTrue(exports_memory.Assign(inferred, { [name]: Union(results) })) : ExtendsFalse();
}

// node_modules/typebox/build/type/extends/tuple.mjs
function Reverse(types) {
  return [...types].reverse();
}
function ApplyReverse(types, reversed) {
  return reversed ? Reverse(types) : types;
}
function Reversed(types) {
  const first = types.length > 0 ? types[0] : undefined;
  const inferrable = IsSchema(first) ? TryRestInferable(first) : undefined;
  return IsSchema(inferrable);
}
function ElementsCompare(inferred, reversed, left, leftRest, right, rightRest) {
  return Match3(ExtendsLeft(inferred, left, right), (checkInferred) => Elements(checkInferred, reversed, leftRest, rightRest), () => ExtendsFalse());
}
function ElementsLeft(inferred, reversed, leftRest, right, rightRest) {
  const inferable = TryRestInferable(right);
  return IsInferable(inferable) ? InferTupleResult(inferred, inferable["name"], ApplyReverse(leftRest, reversed), inferable["type"]) : exports_guard.TakeLeft(leftRest, (head, tail) => ElementsCompare(inferred, reversed, head, tail, right, rightRest), () => ExtendsFalse());
}
function ElementsRight(inferred, reversed, leftRest, rightRest) {
  return exports_guard.TakeLeft(rightRest, (head, tail) => ElementsLeft(inferred, reversed, leftRest, head, tail), () => exports_guard.IsEqual(leftRest.length, 0) ? ExtendsTrue(inferred) : ExtendsFalse());
}
function Elements(inferred, reversed, leftRest, rightRest) {
  return ElementsRight(inferred, reversed, leftRest, rightRest);
}
function ExtendsTupleToTuple(inferred, left, right) {
  const instantiatedRight = InstantiateElements(inferred, { callstack: [] }, right);
  const reversed = Reversed(instantiatedRight);
  return Elements(inferred, reversed, ApplyReverse(left, reversed), ApplyReverse(instantiatedRight, reversed));
}
function ExtendsTupleToArray(inferred, left, right) {
  const inferrable = TryInferable(right);
  return IsInferable(inferrable) ? InferUnionResult(inferred, inferrable["name"], left, inferrable["type"]) : exports_guard.TakeLeft(left, (head, tail) => Match3(ExtendsLeft(inferred, head, right), (inferred2) => ExtendsTupleToArray(inferred2, tail, right), () => ExtendsFalse()), () => ExtendsTrue(inferred));
}
function ExtendsTuple(inferred, left, right) {
  const instantiatedLeft = InstantiateElements(inferred, { callstack: [] }, left);
  return IsTuple(right) ? ExtendsTupleToTuple(inferred, instantiatedLeft, right.items) : IsArray2(right) ? ExtendsTupleToArray(inferred, instantiatedLeft, right.items) : ExtendsRight(inferred, Tuple(instantiatedLeft), right);
}

// node_modules/typebox/build/type/extends/undefined.mjs
function ExtendsUndefined(inferred, left, right) {
  return IsVoid(right) ? ExtendsTrue(inferred) : IsUndefined2(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
}

// node_modules/typebox/build/type/extends/union.mjs
function ExtendsUnionSome(inferred, type, unionTypes) {
  return exports_guard.TakeLeft(unionTypes, (head, tail) => Match3(ExtendsLeft(inferred, type, head), (inferred2) => ExtendsTrue(inferred2), () => ExtendsUnionSome(inferred, type, tail)), () => ExtendsFalse());
}
function ExtendsUnionLeft(inferred, left, right) {
  return exports_guard.TakeLeft(left, (head, tail) => Match3(ExtendsUnionSome(inferred, head, right), (inferred2) => ExtendsUnionLeft(inferred2, tail, right), () => ExtendsFalse()), () => ExtendsTrue(inferred));
}
function ExtendsUnion2(inferred, left, right) {
  const inferrable = TryInferable(right);
  return IsInferable(inferrable) ? InferUnionResult(inferred, inferrable.name, left, inferrable.type) : IsUnion(right) ? ExtendsUnionLeft(inferred, left, right.anyOf) : ExtendsUnionLeft(inferred, left, [right]);
}

// node_modules/typebox/build/type/extends/unknown.mjs
function ExtendsUnknown(inferred, left, right) {
  return IsInfer(right) ? ExtendsRight(inferred, left, right) : IsAny(right) ? ExtendsTrue(inferred) : IsUnknown(right) ? ExtendsTrue(inferred) : ExtendsFalse();
}

// node_modules/typebox/build/type/extends/void.mjs
function ExtendsVoid(inferred, left, right) {
  return IsVoid(right) ? ExtendsTrue(inferred) : ExtendsRight(inferred, left, right);
}

// node_modules/typebox/build/type/extends/extends_left.mjs
function ExtendsLeft(inferred, left, right) {
  return IsAny(left) ? ExtendsAny(inferred, left, right) : IsArray2(left) ? ExtendsArray(inferred, left, left.items, right) : IsAsyncIterator2(left) ? ExtendsAsyncIterator(inferred, left.iteratorItems, right) : IsBigInt2(left) ? ExtendsBigInt(inferred, left, right) : IsBoolean2(left) ? ExtendsBoolean(inferred, left, right) : IsConstructor2(left) ? ExtendsConstructor(inferred, left.parameters, left.instanceType, right) : IsEnum(left) ? ExtendsEnum(inferred, left, right) : IsFunction2(left) ? ExtendsFunction(inferred, left.parameters, left.returnType, right) : IsInteger2(left) ? ExtendsInteger(inferred, left, right) : IsIntersect(left) ? ExtendsIntersect(inferred, left.allOf, right) : IsIterator2(left) ? ExtendsIterator(inferred, left.iteratorItems, right) : IsLiteral(left) ? ExtendsLiteral(inferred, left, right) : IsNever(left) ? ExtendsNever(inferred, left, right) : IsNull2(left) ? ExtendsNull(inferred, left, right) : IsNumber2(left) ? ExtendsNumber(inferred, left, right) : IsObject2(left) ? ExtendsObject(inferred, left.properties, right) : IsPromise(left) ? ExtendsPromise(inferred, left.item, right) : IsString2(left) ? ExtendsString(inferred, left, right) : IsSymbol2(left) ? ExtendsSymbol(inferred, left, right) : IsTemplateLiteral(left) ? ExtendsTemplateLiteral(inferred, left.pattern, right) : IsTuple(left) ? ExtendsTuple(inferred, left.items, right) : IsUndefined2(left) ? ExtendsUndefined(inferred, left, right) : IsUnion(left) ? ExtendsUnion2(inferred, left.anyOf, right) : IsUnknown(left) ? ExtendsUnknown(inferred, left, right) : IsVoid(left) ? ExtendsVoid(inferred, left, right) : ExtendsFalse();
}

// node_modules/typebox/build/type/engine/interface/instantiate.mjs
function InterfaceOperation(heritage, properties2) {
  const result = EvaluateIntersect([...heritage, _Object_(properties2)]);
  return result;
}
function InterfaceAction(heritage, properties2, options) {
  const result = CanInstantiate(heritage) ? exports_memory.Update(InterfaceOperation(heritage, properties2), {}, options) : InterfaceDeferred(heritage, properties2, options);
  return result;
}
function InterfaceInstantiate(context, state, heritage, properties2, options) {
  const instantiatedHeritage = InstantiateTypes(context, state, heritage);
  const instantiatedProperties = InstantiateProperties(context, state, properties2);
  return InterfaceAction(instantiatedHeritage, instantiatedProperties, options);
}

// node_modules/typebox/build/type/action/interface.mjs
function InterfaceDeferred(heritage, properties2, options = {}) {
  return Deferred("Interface", [heritage, properties2], options);
}
function IsInterfaceDeferred(value) {
  return IsSchema(value) && exports_guard.HasPropertyKey(value, "action") && exports_guard.IsEqual(value.action, "Interface");
}
function Interface(heritage, properties2, options = {}) {
  return InterfaceAction(heritage, properties2, options);
}

// node_modules/typebox/build/type/engine/cyclic/check.mjs
function FromRef(stack, context, ref2) {
  return stack.includes(ref2) ? true : FromType3([...stack, ref2], context, context[ref2]);
}
function FromProperties(stack, context, properties2) {
  const types = PropertyValues(properties2);
  return FromTypes2(stack, context, types);
}
function FromTypes2(stack, context, types) {
  return exports_guard.TakeLeft(types, (left, right) => FromType3(stack, context, left) ? true : FromTypes2(stack, context, right), () => false);
}
function FromType3(stack, context, type) {
  return IsRef(type) ? FromRef(stack, context, type.$ref) : IsArray2(type) ? FromType3(stack, context, type.items) : IsAsyncIterator2(type) ? FromType3(stack, context, type.iteratorItems) : IsConstructor2(type) ? FromTypes2(stack, context, [...type.parameters, type.instanceType]) : IsFunction2(type) ? FromTypes2(stack, context, [...type.parameters, type.returnType]) : IsInterfaceDeferred(type) ? FromProperties(stack, context, type.parameters[1]) : IsIntersect(type) ? FromTypes2(stack, context, type.allOf) : IsIterator2(type) ? FromType3(stack, context, type.iteratorItems) : IsObject2(type) ? FromProperties(stack, context, type.properties) : IsPromise(type) ? FromType3(stack, context, type.item) : IsUnion(type) ? FromTypes2(stack, context, type.anyOf) : IsTuple(type) ? FromTypes2(stack, context, type.items) : IsRecord(type) ? FromType3(stack, context, RecordValue(type)) : false;
}
function CyclicCheck(stack, context, type) {
  const result = FromType3(stack, context, type);
  return result;
}

// node_modules/typebox/build/type/engine/cyclic/candidates.mjs
function ResolveCandidateKeys(context, keys) {
  return keys.reduce((result, left) => {
    return left in context ? CyclicCheck([left], context, context[left]) ? [...result, left] : result : Unreachable();
  }, []);
}
function CyclicCandidates(context) {
  const keys = PropertyKeys(context);
  const result = ResolveCandidateKeys(context, keys);
  return result;
}
// node_modules/typebox/build/type/engine/cyclic/dependencies.mjs
function FromRef2(context, ref2, result) {
  return result.includes(ref2) ? result : (ref2 in context) ? FromType4(context, context[ref2], [...result, ref2]) : Unreachable();
}
function FromProperties2(context, properties2, result) {
  const types = PropertyValues(properties2);
  return FromTypes3(context, types, result);
}
function FromTypes3(context, types, result) {
  return types.reduce((result2, left) => {
    return FromType4(context, left, result2);
  }, result);
}
function FromType4(context, type, result) {
  return IsRef(type) ? FromRef2(context, type.$ref, result) : IsArray2(type) ? FromType4(context, type.items, result) : IsAsyncIterator2(type) ? FromType4(context, type.iteratorItems, result) : IsConstructor2(type) ? FromTypes3(context, [...type.parameters, type.instanceType], result) : IsFunction2(type) ? FromTypes3(context, [...type.parameters, type.returnType], result) : IsInterfaceDeferred(type) ? FromProperties2(context, type.parameters[1], result) : IsIntersect(type) ? FromTypes3(context, type.allOf, result) : IsIterator2(type) ? FromType4(context, type.iteratorItems, result) : IsObject2(type) ? FromProperties2(context, type.properties, result) : IsPromise(type) ? FromType4(context, type.item, result) : IsUnion(type) ? FromTypes3(context, type.anyOf, result) : IsTuple(type) ? FromTypes3(context, type.items, result) : IsRecord(type) ? FromType4(context, RecordValue(type), result) : result;
}
function CyclicDependencies(context, key, type) {
  const result = FromType4(context, type, [key]);
  return result;
}
// node_modules/typebox/build/type/engine/cyclic/extends.mjs
function FromRef3(_ref) {
  return Any();
}
function FromProperties3(properties2) {
  return exports_guard.Keys(properties2).reduce((result, key) => {
    return { ...result, [key]: FromType5(properties2[key]) };
  }, {});
}
function FromTypes4(types) {
  return types.reduce((result, left) => {
    return [...result, FromType5(left)];
  }, []);
}
function FromType5(type) {
  return IsRef(type) ? FromRef3(type.$ref) : IsArray2(type) ? _Array_(FromType5(type.items), ArrayOptions(type)) : IsAsyncIterator2(type) ? AsyncIterator(FromType5(type.iteratorItems)) : IsConstructor2(type) ? Constructor(FromTypes4(type.parameters), FromType5(type.instanceType)) : IsFunction2(type) ? _Function_(FromTypes4(type.parameters), FromType5(type.returnType)) : IsIntersect(type) ? Intersect(FromTypes4(type.allOf)) : IsIterator2(type) ? Iterator(FromType5(type.iteratorItems)) : IsObject2(type) ? _Object_(FromProperties3(type.properties)) : IsPromise(type) ? _Promise_(FromType5(type.item)) : IsRecord(type) ? Record(RecordKey(type), FromType5(RecordValue(type))) : IsUnion(type) ? Union(FromTypes4(type.anyOf)) : IsTuple(type) ? Tuple(FromTypes4(type.items)) : type;
}
function CyclicAnyFromParameters(defs, ref2) {
  return ref2 in defs ? FromType5(defs[ref2]) : Unknown();
}
function CyclicExtends(type) {
  return CyclicAnyFromParameters(type.$defs, type.$ref);
}
// node_modules/typebox/build/type/engine/cyclic/instantiate.mjs
function CyclicInterface(context, heritage, properties2) {
  const instantiatedHeritage = InstantiateTypes(context, { callstack: [] }, heritage);
  const instantiatedProperties = InstantiateProperties({}, { callstack: [] }, properties2);
  const evaluatedInterface = EvaluateIntersect([...instantiatedHeritage, _Object_(instantiatedProperties)]);
  return evaluatedInterface;
}
function CyclicDefinitions(context, dependencies) {
  const keys = exports_guard.Keys(context).filter((key) => dependencies.includes(key));
  return keys.reduce((result, key) => {
    const type = context[key];
    const instantiatedType = IsInterfaceDeferred(type) ? CyclicInterface(context, type.parameters[0], type.parameters[1]) : type;
    return { ...result, [key]: instantiatedType };
  }, {});
}
function InstantiateCyclic(context, ref2, type) {
  const dependencies = CyclicDependencies(context, ref2, type);
  const definitions = CyclicDefinitions(context, dependencies);
  const result = Cyclic(definitions, ref2);
  return result;
}
// node_modules/typebox/build/type/engine/cyclic/target.mjs
function Resolve(defs, ref2) {
  return ref2 in defs ? IsRef(defs[ref2]) ? Resolve(defs, defs[ref2].$ref) : defs[ref2] : Never();
}
function CyclicTarget(defs, ref2) {
  const result = Resolve(defs, ref2);
  return result;
}
// node_modules/typebox/build/type/extends/extends.mjs
function Canonical(type) {
  return IsCyclic(type) ? CyclicExtends(type) : IsUnsafe(type) ? Unknown() : type;
}
function Extends2(inferred, left, right) {
  const canonicalLeft = Canonical(left);
  const canonicalRight = Canonical(right);
  return ExtendsLeft(inferred, canonicalLeft, canonicalRight);
}
// node_modules/typebox/build/type/engine/evaluate/compare.mjs
var ResultEqual = "equal";
var ResultDisjoint = "disjoint";
var ResultLeftInside = "left-inside";
var ResultRightInside = "right-inside";
function Compare(left, right) {
  const extendsCheck = [
    IsUnknown(left) ? exports_result.ExtendsFalse() : Extends2({}, left, right),
    IsUnknown(left) ? exports_result.ExtendsTrue({}) : Extends2({}, right, left)
  ];
  return exports_result.IsExtendsTrueLike(extendsCheck[0]) && exports_result.IsExtendsTrueLike(extendsCheck[1]) ? ResultEqual : exports_result.IsExtendsTrueLike(extendsCheck[0]) && exports_result.IsExtendsFalse(extendsCheck[1]) ? ResultLeftInside : exports_result.IsExtendsFalse(extendsCheck[0]) && exports_result.IsExtendsTrueLike(extendsCheck[1]) ? ResultRightInside : ResultDisjoint;
}

// node_modules/typebox/build/type/engine/evaluate/broaden.mjs
function BroadFilter(type, types) {
  return types.filter((left) => {
    return Compare(type, left) === ResultRightInside ? false : true;
  });
}
function IsBroadestType(type, types) {
  const result = types.some((left) => {
    const result2 = Compare(type, left);
    return exports_guard.IsEqual(result2, ResultLeftInside) || exports_guard.IsEqual(result2, ResultEqual);
  });
  return exports_guard.IsEqual(result, false);
}
function BroadenType(type, types) {
  const evaluated = EvaluateType(type);
  return IsAny(evaluated) ? [evaluated] : IsBroadestType(evaluated, types) ? [...BroadFilter(evaluated, types), evaluated] : types;
}
function BroadenTypes(types) {
  return types.reduce((result, left) => {
    return IsObject2(left) ? [...result, left] : IsNever(left) ? result : BroadenType(left, result);
  }, []);
}
function Broaden(types) {
  const broadened = BroadenTypes(types);
  const flattened = Flatten(broadened);
  const result = flattened.length === 0 ? Never() : flattened.length === 1 ? flattened[0] : Union(flattened);
  return result;
}
// node_modules/typebox/build/type/engine/evaluate/instantiate.mjs
function EvaluateAction(type, options) {
  const result = exports_memory.Update(EvaluateType(type), {}, options);
  return result;
}
function EvaluateInstantiate(context, state, type, options) {
  const instantiatedType = InstantiateType(context, state, type);
  return EvaluateAction(instantiatedType, options);
}
// node_modules/typebox/build/type/engine/call/distribute_arguments.mjs
function CollectDistributionNames(expression, result = []) {
  return IsDeferred(expression) && exports_guard.IsEqual(expression.action, "Conditional") ? IsRef(expression.parameters[0]) ? CollectDistributionNames(expression.parameters[2], CollectDistributionNames(expression.parameters[3], [...result, expression.parameters[0]["$ref"]])) : CollectDistributionNames(expression.parameters[2], CollectDistributionNames(expression.parameters[3], result)) : IsDeferred(expression) && exports_guard.IsEqual(expression.action, "Mapped") ? IsDeferred(expression.parameters[1]) && exports_guard.IsEqual(expression.parameters[1].action, "KeyOf") && IsRef(expression.parameters[1].parameters[0]) ? [...result, expression.parameters[1].parameters[0]["$ref"]] : result : result;
}
function BuildDistributionArray(parameters, names) {
  return parameters.reduce((result, left) => [...result, names.includes(left.name)], []);
}
function ZipDistributionArray(arguments_, distributionArray, result = []) {
  return exports_guard.TakeLeft(arguments_, (argumentLeft, argumentRight) => exports_guard.TakeLeft(distributionArray, (booleanLeft, booleanRight) => ZipDistributionArray(argumentRight, booleanRight, [...result, [booleanLeft, argumentLeft]]), () => result), () => result);
}
function Expand(type) {
  return IsUnion(type) ? [...type.anyOf] : [type];
}
function Append(current, type) {
  return current.reduce((result, left) => [...result, [...left, type]], []);
}
function Cross(current, variants) {
  return variants.reduce((result, left) => {
    return [...result, ...Append(current, left)];
  }, []);
}
function Distribute2(zipped) {
  return zipped.reduce((result, left) => {
    return exports_guard.IsEqual(left[0], true) ? Cross(result, Expand(left[1])) : Cross(result, [left[1]]);
  }, [[]]);
}
function DistributeArguments(parameters, arguments_, expression) {
  const distributionNames = CollectDistributionNames(expression);
  const distributionArray = BuildDistributionArray(parameters, distributionNames);
  const zippedArguments = ZipDistributionArray(arguments_, distributionArray);
  return IsDeferred(expression) && exports_guard.IsEqual(expression.action, "Conditional") ? Distribute2(zippedArguments) : IsDeferred(expression) && exports_guard.IsEqual(expression.action, "Mapped") ? Distribute2(zippedArguments) : [arguments_];
}

// node_modules/typebox/build/type/engine/call/resolve_target.mjs
function FromNotResolvable() {
  return ["(not-resolvable)", Never()];
}
function FromNotGeneric() {
  return ["(not-generic)", Never()];
}
function FromGeneric(name, parameters, expression) {
  return [name, Generic(parameters, expression)];
}
function FromRef4(context, ref2, arguments_) {
  return ref2 in context ? FromType6(context, ref2, context[ref2], arguments_) : FromNotResolvable();
}
function FromType6(context, name, target2, arguments_) {
  return IsGeneric(target2) ? FromGeneric(name, target2.parameters, target2.expression) : IsRef(target2) ? FromRef4(context, target2.$ref, arguments_) : FromNotGeneric();
}
function ResolveTarget(context, target2, arguments_) {
  return FromType6(context, "(anonymous)", target2, arguments_);
}

// node_modules/typebox/build/type/engine/call/resolve_arguments.mjs
function AssertArgumentExtends(name, type, extends_) {
  if (IsInfer(type) || IsCall(type) || exports_result.IsExtendsTrueLike(Extends2({}, type, extends_)))
    return;
  const cause = { parameter: name, expect: extends_, actual: type };
  throw new Error(`Argument for parameter ${name} does not satisfy constraint`, { cause });
}
function BindArgument(context, state, name, extends_, type) {
  const instantiatedArgument = InstantiateType(context, state, type);
  AssertArgumentExtends(name, instantiatedArgument, extends_);
  return exports_memory.Assign(context, { [name]: instantiatedArgument });
}
function BindArguments(context, state, parameterLeft, parameterRight, arguments_) {
  const instantiatedExtends = InstantiateType(context, state, parameterLeft.extends);
  const instantiatedEquals = InstantiateType(context, state, parameterLeft.equals);
  return exports_guard.TakeLeft(arguments_, (left, right) => BindParameters(BindArgument(context, state, parameterLeft["name"], instantiatedExtends, left), state, parameterRight, right), () => BindParameters(BindArgument(context, state, parameterLeft["name"], instantiatedExtends, instantiatedEquals), state, parameterRight, []));
}
function BindParameters(context, state, parameters, arguments_) {
  return exports_guard.TakeLeft(parameters, (left, right) => BindArguments(context, state, left, right, arguments_), () => context);
}
function ResolveArgumentsContext(context, state, parameters, arguments_) {
  return BindParameters(context, state, parameters, arguments_);
}

// node_modules/typebox/build/type/engine/call/instantiate.mjs
function Peek(state) {
  const result = exports_guard.IsGreaterThan(state.callstack.length, 0) ? state.callstack[state.callstack.length - 1] : "";
  return result;
}
function IsTailCall(state, name) {
  const result = exports_guard.IsEqual(Peek(state), name);
  return result;
}
function CallDispatch(context, state, target2, parameters, expression, arguments_) {
  const argumentsContext = ResolveArgumentsContext(context, state, parameters, arguments_);
  const returnType = InstantiateType(argumentsContext, { callstack: [...state.callstack, target2.$ref] }, expression);
  return InstantiateType(context, state, returnType);
}
function CallDistributed(context, state, target2, parameters, expression, distributedArguments) {
  return distributedArguments.reduce((result, arguments_) => [...result, CallDispatch(context, state, target2, parameters, expression, arguments_)], []);
}
function CallImmediate(context, state, target2, parameters, expression, arguments_) {
  const distributedArguments = DistributeArguments(parameters, arguments_, expression);
  const returnTypes = CallDistributed(context, state, target2, parameters, expression, distributedArguments);
  const result = exports_guard.IsEqual(returnTypes.length, 1) ? returnTypes[0] : EvaluateUnion(returnTypes);
  return result;
}
function CallInstantiate(context, state, target2, arguments_) {
  const instantiatedArguments = InstantiateTypes(context, state, arguments_);
  const resolved = ResolveTarget(context, target2, arguments_);
  const name = resolved[0];
  const type = resolved[1];
  const result = IsGeneric(type) ? IsTailCall(state, name) ? CallConstruct(Ref(name), instantiatedArguments) : CallImmediate(context, state, Ref(name), type.parameters, type.expression, instantiatedArguments) : CallConstruct(target2, instantiatedArguments);
  return result;
}

// node_modules/typebox/build/type/types/call.mjs
function CallConstruct(target2, arguments_) {
  return exports_memory.Create({ ["~kind"]: "Call" }, { target: target2, arguments: arguments_ }, {});
}
function Call(target2, arguments_) {
  return CallInstantiate({}, { callstack: [] }, target2, arguments_);
}
function IsCall(value) {
  return IsKind(value, "Call");
}

// node_modules/typebox/build/type/engine/intrinsics/mapping.mjs
function ApplyMapping(mapping, value) {
  return mapping(value);
}

// node_modules/typebox/build/type/engine/intrinsics/from_literal.mjs
function FromLiteral3(mapping, value) {
  return exports_guard.IsString(value) ? Literal(ApplyMapping(mapping, value)) : Literal(value);
}

// node_modules/typebox/build/type/engine/intrinsics/from_template_literal.mjs
function FromTemplateLiteral(mapping, pattern) {
  const decoded = TemplateLiteralDecode(pattern);
  const result = FromType7(mapping, decoded);
  return result;
}

// node_modules/typebox/build/type/engine/intrinsics/from_union.mjs
function FromUnion2(mapping, types) {
  const result = types.map((type) => FromType7(mapping, type));
  return Union(result);
}

// node_modules/typebox/build/type/engine/intrinsics/from_type.mjs
function FromType7(mapping, type) {
  return IsLiteral(type) ? FromLiteral3(mapping, type.const) : IsTemplateLiteral(type) ? FromTemplateLiteral(mapping, type.pattern) : IsUnion(type) ? FromUnion2(mapping, type.anyOf) : type;
}

// node_modules/typebox/build/type/action/capitalize.mjs
function CapitalizeDeferred(type, options = {}) {
  return Deferred("Capitalize", [type], options);
}
function Capitalize(type, options = {}) {
  return CapitalizeAction(type, options);
}

// node_modules/typebox/build/type/action/lowercase.mjs
function LowercaseDeferred(type, options = {}) {
  return Deferred("Lowercase", [type], options);
}
function Lowercase(type, options = {}) {
  return LowercaseAction(type, options);
}

// node_modules/typebox/build/type/action/uncapitalize.mjs
function UncapitalizeDeferred(type, options = {}) {
  return Deferred("Uncapitalize", [type], options);
}
function Uncapitalize(type, options = {}) {
  return UncapitalizeAction(type, options);
}

// node_modules/typebox/build/type/action/uppercase.mjs
function UppercaseDeferred(type, options = {}) {
  return Deferred("Uppercase", [type], options);
}
function Uppercase(type, options = {}) {
  return UppercaseAction(type, options);
}

// node_modules/typebox/build/type/engine/intrinsics/instantiate.mjs
var CapitalizeMapping = (input) => input[0].toUpperCase() + input.slice(1);
var LowercaseMapping = (input) => input.toLowerCase();
var UncapitalizeMapping = (input) => input[0].toLowerCase() + input.slice(1);
var UppercaseMapping = (input) => input.toUpperCase();
function CapitalizeAction(type, options) {
  const result = CanInstantiate([type]) ? exports_memory.Update(FromType7(CapitalizeMapping, type), {}, options) : CapitalizeDeferred(type, options);
  return result;
}
function LowercaseAction(type, options) {
  const result = CanInstantiate([type]) ? exports_memory.Update(FromType7(LowercaseMapping, type), {}, options) : LowercaseDeferred(type, options);
  return result;
}
function UncapitalizeAction(type, options) {
  const result = CanInstantiate([type]) ? exports_memory.Update(FromType7(UncapitalizeMapping, type), {}, options) : UncapitalizeDeferred(type, options);
  return result;
}
function UppercaseAction(type, options) {
  const result = CanInstantiate([type]) ? exports_memory.Update(FromType7(UppercaseMapping, type), {}, options) : UppercaseDeferred(type, options);
  return result;
}
function CapitalizeInstantiate(context, state, type, options) {
  const instantiatedType = InstantiateType(context, state, type);
  return CapitalizeAction(instantiatedType, options);
}
function LowercaseInstantiate(context, state, type, options) {
  const instantiatedType = InstantiateType(context, state, type);
  return LowercaseAction(instantiatedType, options);
}
function UncapitalizeInstantiate(context, state, type, options) {
  const instantiatedType = InstantiateType(context, state, type);
  return UncapitalizeAction(instantiatedType, options);
}
function UppercaseInstantiate(context, state, type, options) {
  const instantiatedType = InstantiateType(context, state, type);
  return UppercaseAction(instantiatedType, options);
}

// node_modules/typebox/build/type/action/conditional.mjs
function ConditionalDeferred(left, right, true_, false_, options = {}) {
  return Deferred("Conditional", [left, right, true_, false_], options);
}
function Conditional(left, right, true_, false_, options = {}) {
  return ConditionalAction({}, { callstack: [] }, left, right, true_, false_, options);
}

// node_modules/typebox/build/type/engine/conditional/instantiate.mjs
function ConditionalOperation(context, state, left, right, true_, false_) {
  const extendsResult = Extends2(context, left, right);
  return exports_result.IsExtendsUnion(extendsResult) ? Union([InstantiateType(extendsResult.inferred, state, true_), InstantiateType(context, state, false_)]) : exports_result.IsExtendsTrue(extendsResult) ? InstantiateType(extendsResult.inferred, state, true_) : InstantiateType(context, state, false_);
}
function ConditionalAction(context, state, left, right, true_, false_, options) {
  const result = CanInstantiate([left, right]) ? exports_memory.Update(ConditionalOperation(context, state, left, right, true_, false_), {}, options) : ConditionalDeferred(left, right, true_, false_, options);
  return result;
}
function ConditionalInstantiate(context, state, left, right, true_, false_, options) {
  const instantiatedLeft = InstantiateType(context, state, left);
  const instantiatedRight = InstantiateType(context, state, right);
  return ConditionalAction(context, state, instantiatedLeft, instantiatedRight, true_, false_, options);
}
// node_modules/typebox/build/type/action/constructor_parameters.mjs
function ConstructorParametersDeferred(type, options = {}) {
  return Deferred("ConstructorParameters", [type], options);
}
function ConstructorParameters(type, options = {}) {
  return ConstructorParametersAction(type, options);
}

// node_modules/typebox/build/type/engine/constructor_parameters/instantiate.mjs
function ConstructorParametersOperation(type) {
  const parameters = IsConstructor2(type) ? type["parameters"] : [];
  const instantiatedParameters = InstantiateElements({}, { callstack: [] }, parameters);
  const result = Tuple(instantiatedParameters);
  return result;
}
function ConstructorParametersAction(type, options) {
  const result = CanInstantiate([type]) ? exports_memory.Update(ConstructorParametersOperation(type), {}, options) : ConstructorParametersDeferred(type, options);
  return result;
}
function ConstructorParametersInstantiate(context, state, type, options) {
  const instantiatedType = InstantiateType(context, state, type);
  return ConstructorParametersAction(instantiatedType, options);
}

// node_modules/typebox/build/type/action/exclude.mjs
function ExcludeDeferred(left, right, options = {}) {
  return Deferred("Exclude", [left, right], options);
}
function Exclude(left, right, options = {}) {
  return ExcludeAction(left, right, options);
}

// node_modules/typebox/build/type/engine/exclude/operation.mjs
function ExcludeUnionLeft(types, right) {
  return types.reduce((result, head) => {
    return [...result, ...ExcludeTypeLeft(head, right)];
  }, []);
}
function ExcludeTypeLeft(left, right) {
  const check2 = Extends2({}, left, right);
  const result = exports_result.IsExtendsTrueLike(check2) ? [] : [left];
  return result;
}
function ExcludeOperation(left, right) {
  const remaining = IsEnum(left) ? ExcludeUnionLeft(EnumValuesToVariants(left.enum), right) : IsUnion(left) ? ExcludeUnionLeft(Flatten(left.anyOf), right) : ExcludeTypeLeft(left, right);
  const result = EvaluateUnion(remaining);
  return result;
}

// node_modules/typebox/build/type/engine/exclude/instantiate.mjs
function ExcludeAction(left, right, options) {
  const result = CanInstantiate([left, right]) ? exports_memory.Update(ExcludeOperation(left, right), {}, options) : ExcludeDeferred(left, right, options);
  return result;
}
function ExcludeInstantiate(context, state, left, right, options) {
  const instantiatedLeft = InstantiateType(context, state, left);
  const instantiatedRight = InstantiateType(context, state, right);
  return ExcludeAction(instantiatedLeft, instantiatedRight, options);
}

// node_modules/typebox/build/type/action/extract.mjs
function ExtractDeferred(left, right, options = {}) {
  return Deferred("Extract", [left, right], options);
}
function Extract(left, right, options = {}) {
  return ExtractAction(left, right, options);
}

// node_modules/typebox/build/type/engine/extract/operation.mjs
function ExtractUnionLeft(types, right) {
  return types.reduce((result, head) => {
    return [...result, ...ExtractTypeLeft(head, right)];
  }, []);
}
function ExtractTypeLeft(left, right) {
  const check2 = Extends2({}, left, right);
  const result = exports_result.IsExtendsTrueLike(check2) ? [left] : [];
  return result;
}
function ExtractOperation(left, right) {
  const remaining = IsEnum(left) ? ExtractUnionLeft(EnumValuesToVariants(left.enum), right) : IsUnion(left) ? ExtractUnionLeft(Flatten(left.anyOf), right) : ExtractTypeLeft(left, right);
  const result = EvaluateUnion(remaining);
  return result;
}

// node_modules/typebox/build/type/engine/extract/instantiate.mjs
function ExtractAction(left, right, options) {
  const result = CanInstantiate([left, right]) ? exports_memory.Update(ExtractOperation(left, right), {}, options) : ExtractDeferred(left, right, options);
  return result;
}
function ExtractInstantiate(context, state, left, right, options) {
  const instantiatedLeft = InstantiateType(context, state, left);
  const instantiatedRight = InstantiateType(context, state, right);
  return ExtractAction(instantiatedLeft, instantiatedRight, options);
}

// node_modules/typebox/build/type/engine/helpers/keys_to_indexer.mjs
function KeysToLiterals(keys) {
  return keys.reduce((result, left) => {
    return IsLiteralValue(left) ? [...result, Literal(left)] : result;
  }, []);
}
function KeysToIndexer(keys) {
  const literals = KeysToLiterals(keys);
  const result = Union(literals);
  return result;
}

// node_modules/typebox/build/type/action/indexed.mjs
function IndexDeferred(type, indexer, options = {}) {
  return Deferred("Index", [type, indexer], options);
}
function Index(type, indexer_or_keys, options = {}) {
  const indexer = exports_guard.IsArray(indexer_or_keys) ? KeysToIndexer(indexer_or_keys) : indexer_or_keys;
  return IndexAction(type, indexer, options);
}

// node_modules/typebox/build/type/engine/object/from_cyclic.mjs
function FromCyclic(defs, ref2) {
  const target2 = CyclicTarget(defs, ref2);
  const result = FromType8(target2);
  return result;
}

// node_modules/typebox/build/type/engine/object/from_intersect.mjs
function CollapseIntersectProperties(left, right) {
  const leftKeys = exports_guard.Keys(left).filter((key) => !exports_guard.HasPropertyKey(right, key));
  const rightKeys = exports_guard.Keys(right).filter((key) => !exports_guard.HasPropertyKey(left, key));
  const sharedKeys = exports_guard.Keys(left).filter((key) => exports_guard.HasPropertyKey(right, key));
  const leftProperties = leftKeys.reduce((result, key) => ({ ...result, [key]: left[key] }), {});
  const rightProperties = rightKeys.reduce((result, key) => ({ ...result, [key]: right[key] }), {});
  const sharedProperties = sharedKeys.reduce((result, key) => ({ ...result, [key]: EvaluateIntersect([left[key], right[key]]) }), {});
  const unique = exports_memory.Assign(leftProperties, rightProperties);
  const shared = exports_memory.Assign(unique, sharedProperties);
  return shared;
}
function FromIntersect(types) {
  return types.reduce((result, left) => {
    return CollapseIntersectProperties(result, FromType8(left));
  }, {});
}

// node_modules/typebox/build/type/engine/object/from_object.mjs
function FromObject2(properties2) {
  return properties2;
}

// node_modules/typebox/build/type/engine/object/from_tuple.mjs
function FromTuple(types) {
  const object2 = TupleToObject(Tuple(types));
  const result = FromType8(object2);
  return result;
}

// node_modules/typebox/build/type/engine/object/from_union.mjs
function CollapseUnionProperties(left, right) {
  const sharedKeys = exports_guard.Keys(left).filter((key) => (key in right));
  const result = sharedKeys.reduce((result2, key) => {
    return { ...result2, [key]: EvaluateUnion([left[key], right[key]]) };
  }, {});
  return result;
}
function ReduceVariants(types, result) {
  return exports_guard.TakeLeft(types, (left, right) => ReduceVariants(right, CollapseUnionProperties(result, FromType8(left))), () => result);
}
function FromUnion3(types) {
  return exports_guard.TakeLeft(types, (left, right) => ReduceVariants(right, FromType8(left)), () => Unreachable());
}

// node_modules/typebox/build/type/engine/object/from_type.mjs
function FromType8(type) {
  return IsCyclic(type) ? FromCyclic(type.$defs, type.$ref) : IsIntersect(type) ? FromIntersect(type.allOf) : IsUnion(type) ? FromUnion3(type.anyOf) : IsTuple(type) ? FromTuple(type.items) : IsObject2(type) ? FromObject2(type.properties) : {};
}

// node_modules/typebox/build/type/engine/object/collapse.mjs
function CollapseToObject(type) {
  const properties2 = FromType8(type);
  const result = _Object_(properties2);
  return result;
}
// node_modules/typebox/build/type/engine/helpers/keys.mjs
var integerKeyPattern = new RegExp("^(?:0|[1-9][0-9]*)$");
function ConvertToIntegerKey(value) {
  const normal = `${value}`;
  return integerKeyPattern.test(normal) ? parseInt(normal) : value;
}

// node_modules/typebox/build/type/engine/indexed/from_array.mjs
function NormalizeLiteral(value) {
  return Literal(ConvertToIntegerKey(value));
}
function NormalizeIndexerTypes(types) {
  return types.map((type) => NormalizeIndexer(type));
}
function NormalizeIndexer(type) {
  return IsIntersect(type) ? Intersect(NormalizeIndexerTypes(type.allOf)) : IsUnion(type) ? Union(NormalizeIndexerTypes(type.anyOf)) : IsLiteral(type) ? NormalizeLiteral(type.const) : type;
}
function FromArray2(type, indexer) {
  const normalizedIndexer = NormalizeIndexer(indexer);
  const check2 = Extends2({}, normalizedIndexer, Number2());
  const result = exports_result.IsExtendsTrueLike(check2) ? type : IsLiteral(indexer) && exports_guard.IsEqual(indexer.const, "length") ? Number2() : Never();
  return result;
}

// node_modules/typebox/build/type/engine/indexable/from_cyclic.mjs
function FromCyclic2(defs, ref2) {
  const target2 = CyclicTarget(defs, ref2);
  const result = FromType9(target2);
  return result;
}

// node_modules/typebox/build/type/engine/indexable/from_union.mjs
function FromUnion4(types) {
  return types.reduce((result, left) => {
    return [...result, ...FromType9(left)];
  }, []);
}

// node_modules/typebox/build/type/engine/indexable/from_enum.mjs
function FromEnum(values) {
  const variants = EnumValuesToVariants(values);
  const result = FromUnion4(variants);
  return result;
}

// node_modules/typebox/build/type/engine/indexable/from_intersect.mjs
function FromIntersect2(types) {
  const evaluated = EvaluateIntersect(types);
  const result = FromType9(evaluated);
  return result;
}

// node_modules/typebox/build/type/engine/indexable/from_literal.mjs
function FromLiteral4(value) {
  const result = [`${value}`];
  return result;
}

// node_modules/typebox/build/type/engine/indexable/from_template_literal.mjs
function FromTemplateLiteral2(pattern) {
  const decoded = TemplateLiteralDecode(pattern);
  const result = FromType9(decoded);
  return result;
}

// node_modules/typebox/build/type/engine/indexable/from_type.mjs
function FromType9(type) {
  return IsCyclic(type) ? FromCyclic2(type.$defs, type.$ref) : IsEnum(type) ? FromEnum(type.enum) : IsIntersect(type) ? FromIntersect2(type.allOf) : IsLiteral(type) ? FromLiteral4(type.const) : IsTemplateLiteral(type) ? FromTemplateLiteral2(type.pattern) : IsUnion(type) ? FromUnion4(type.anyOf) : [];
}

// node_modules/typebox/build/type/engine/indexable/to_indexable_keys.mjs
function ToIndexableKeys(type) {
  const result = FromType9(type);
  return result;
}

// node_modules/typebox/build/type/engine/this/expand_this.mjs
function FromTypes5(properties2, types) {
  return types.map((type) => FromType10(properties2, type));
}
function FromType10(properties2, type) {
  return IsArray2(type) ? _Array_(FromType10(properties2, type.items)) : IsAsyncIterator2(type) ? AsyncIterator(FromType10(properties2, type.iteratorItems)) : IsConstructor2(type) ? Constructor(FromTypes5(properties2, type.parameters), FromType10(properties2, type.instanceType)) : IsFunction2(type) ? _Function_(FromTypes5(properties2, type.parameters), FromType10(properties2, type.returnType)) : IsIterator2(type) ? Iterator(FromType10(properties2, type.iteratorItems)) : IsPromise(type) ? _Promise_(FromType10(properties2, type.item)) : IsTuple(type) ? Tuple(FromTypes5(properties2, type.items)) : IsUnion(type) ? Union(FromTypes5(properties2, type.anyOf)) : IsIntersect(type) ? Intersect(FromTypes5(properties2, type.allOf)) : IsThis(type) ? _Object_(properties2) : type;
}
function ExpandThis(properties2, type) {
  const result = FromType10(properties2, type);
  return result;
}

// node_modules/typebox/build/type/engine/indexed/from_object.mjs
function IndexProperty(properties2, key) {
  const selectedType = key in properties2 ? properties2[key] : Never();
  const result = ExpandThis(properties2, selectedType);
  return result;
}
function IndexProperties(properties2, keys) {
  return keys.reduce((result, left) => {
    return [...result, IndexProperty(properties2, left)];
  }, []);
}
function FromIndexer(properties2, indexer) {
  const keys = ToIndexableKeys(indexer);
  const variants = IndexProperties(properties2, keys);
  const result = EvaluateUnion(variants);
  return result;
}
var NumericKeyPattern = new RegExp(IntegerKey);
function NumericKeys(keys) {
  const result = keys.filter((key) => NumericKeyPattern.test(key));
  return result;
}
function FromIndexerNumber(properties2) {
  const keys = PropertyKeys(properties2);
  const numericKeys = NumericKeys(keys);
  const variants = IndexProperties(properties2, numericKeys);
  const result = EvaluateUnion(variants);
  return result;
}
function FromObject3(properties2, indexer) {
  const result = IsNumber2(indexer) ? FromIndexerNumber(properties2) : FromIndexer(properties2, indexer);
  return result;
}

// node_modules/typebox/build/type/engine/indexed/array_indexer.mjs
function ConvertLiteral(value) {
  return Literal(ConvertToIntegerKey(value));
}
function ArrayIndexerTypes(types) {
  return types.map((type) => FormatArrayIndexer(type));
}
function FormatArrayIndexer(type) {
  return IsIntersect(type) ? Intersect(ArrayIndexerTypes(type.allOf)) : IsUnion(type) ? Union(ArrayIndexerTypes(type.anyOf)) : IsLiteral(type) ? ConvertLiteral(type.const) : type;
}

// node_modules/typebox/build/type/engine/indexed/from_tuple.mjs
function IndexElementsWithIndexer(types, indexer) {
  return types.reduceRight((result, right, index) => {
    const check2 = Extends2({}, Literal(index), indexer);
    return exports_result.IsExtendsTrueLike(check2) ? [right, ...result] : result;
  }, []);
}
function FromTupleWithIndexer(types, indexer) {
  const formattedArrayIndexer = FormatArrayIndexer(indexer);
  const elements = IndexElementsWithIndexer(types, formattedArrayIndexer);
  return EvaluateUnionFast(elements);
}
function FromTupleWithoutIndexer(types) {
  return EvaluateUnionFast(types);
}
function FromTuple2(types, indexer) {
  return IsLiteral(indexer) && exports_guard.IsEqual(indexer.const, "length") ? Literal(types.length) : IsNumber2(indexer) || IsInteger2(indexer) ? FromTupleWithoutIndexer(types) : FromTupleWithIndexer(types, indexer);
}

// node_modules/typebox/build/type/engine/indexed/from_type.mjs
function FromType11(type, indexer) {
  return IsArray2(type) ? FromArray2(type.items, indexer) : IsObject2(type) ? FromObject3(type.properties, indexer) : IsTuple(type) ? FromTuple2(type.items, indexer) : Never();
}

// node_modules/typebox/build/type/engine/indexed/instantiate.mjs
function NormalizeType(type) {
  const result = IsCyclic(type) || IsIntersect(type) || IsUnion(type) ? CollapseToObject(type) : type;
  return result;
}
function IndexAction(type, indexer, options) {
  const result = CanInstantiate([type, indexer]) ? exports_memory.Update(FromType11(NormalizeType(type), indexer), {}, options) : IndexDeferred(type, indexer, options);
  return result;
}
function IndexInstantiate(context, state, type, indexer, options) {
  const instantiatedType = InstantiateType(context, state, type);
  const instantiatedIndexer = InstantiateType(context, state, indexer);
  return IndexAction(instantiatedType, instantiatedIndexer, options);
}

// node_modules/typebox/build/type/action/instance_type.mjs
function InstanceTypeDeferred(type, options = {}) {
  return Deferred("InstanceType", [type], options);
}
function InstanceType(type, options = {}) {
  return InstanceTypeAction(type, options);
}

// node_modules/typebox/build/type/engine/instance_type/instantiate.mjs
function InstanceTypeOperation(type) {
  return IsConstructor2(type) ? type["instanceType"] : Never();
}
function InstanceTypeAction(type, options) {
  const result = CanInstantiate([type]) ? exports_memory.Update(InstanceTypeOperation(type), {}, options) : InstanceTypeDeferred(type, options);
  return result;
}
function InstanceTypeInstantiate(context, state, type, options = {}) {
  const instantiatedType = InstantiateType(context, state, type);
  return InstanceTypeAction(instantiatedType, options);
}

// node_modules/typebox/build/type/action/keyof.mjs
function KeyOfDeferred(type, options = {}) {
  return Deferred("KeyOf", [type], options);
}
function KeyOf2(type, options = {}) {
  return KeyOfAction(type, options);
}

// node_modules/typebox/build/type/engine/keyof/from_any.mjs
function FromAny() {
  return Union([Number2(), String2(), Symbol2()]);
}

// node_modules/typebox/build/type/engine/keyof/from_array.mjs
function FromArray3(_type) {
  return Number2();
}

// node_modules/typebox/build/type/engine/keyof/from_object.mjs
function FromPropertyKeys(keys) {
  const result = keys.reduce((result2, left) => {
    return IsLiteralValue(left) ? [...result2, Literal(ConvertToIntegerKey(left))] : Unreachable();
  }, []);
  return result;
}
function FromObject4(properties2) {
  const propertyKeys = exports_guard.Keys(properties2);
  const variants = FromPropertyKeys(propertyKeys);
  const result = EvaluateUnionFast(variants);
  return result;
}

// node_modules/typebox/build/type/engine/keyof/from_record.mjs
function FromRecord(type) {
  return RecordKey(type);
}

// node_modules/typebox/build/type/engine/keyof/from_tuple.mjs
function FromTuple3(types) {
  const result = types.map((_, index) => Literal(index));
  return EvaluateUnionFast(result);
}

// node_modules/typebox/build/type/engine/keyof/from_type.mjs
function FromType12(type) {
  return IsAny(type) ? FromAny() : IsArray2(type) ? FromArray3(type.items) : IsObject2(type) ? FromObject4(type.properties) : IsRecord(type) ? FromRecord(type) : IsTuple(type) ? FromTuple3(type.items) : Never();
}

// node_modules/typebox/build/type/engine/keyof/instantiate.mjs
function NormalizeType2(type) {
  const result = IsCyclic(type) || IsIntersect(type) || IsUnion(type) ? CollapseToObject(type) : type;
  return result;
}
function KeyOfAction(type, options) {
  return CanInstantiate([type]) ? exports_memory.Update(FromType12(NormalizeType2(type)), {}, options) : KeyOfDeferred(type, options);
}
function KeyOfInstantiate(context, state, type, options) {
  const instantiatedType = InstantiateType(context, state, type);
  return KeyOfAction(instantiatedType, options);
}

// node_modules/typebox/build/type/action/mapped.mjs
function MappedDeferred(identifier2, type, as, property, options = {}) {
  return Deferred("Mapped", [identifier2, type, as, property], options);
}
function Mapped2(identifier2, type, as, property, options = {}) {
  return MappedAction({}, { callstack: [] }, identifier2, type, as, property, options);
}

// node_modules/typebox/build/type/engine/mapped/mapped_variants.mjs
function FromTemplateLiteral3(pattern) {
  const decoded = TemplateLiteralDecode(pattern);
  const result = FromType13(decoded);
  return result;
}
function FromUnion5(types) {
  return types.reduce((result, left) => {
    return [...result, ...FromType13(left)];
  }, []);
}
function FromLiteral5(value) {
  const result = exports_guard.IsNumber(value) ? [Literal(`${value}`)] : [Literal(value)];
  return result;
}
function FromType13(type) {
  const result = IsEnum(type) ? FromUnion5(EnumValuesToVariants(type.enum)) : IsLiteral(type) ? FromLiteral5(type.const) : IsTemplateLiteral(type) ? FromTemplateLiteral3(type.pattern) : IsUnion(type) ? FromUnion5(type.anyOf) : [type];
  return result;
}
function MappedVariants(type) {
  const result = FromType13(type);
  return result;
}

// node_modules/typebox/build/type/engine/mapped/mapped_operation.mjs
function CanonicalAs(instantiatedAs) {
  const result = IsTemplateLiteral(instantiatedAs) ? TemplateLiteralDecode(instantiatedAs.pattern) : instantiatedAs;
  return result;
}
function MappedVariant(context, state, identifier2, variant, as, property) {
  const variantContext = exports_memory.Assign(context, { [identifier2["name"]]: variant });
  const instantiatedAs = InstantiateType(variantContext, state, as);
  const canonicalAs = CanonicalAs(instantiatedAs);
  const instantiatedProperty = InstantiateType(variantContext, state, property);
  return IsLiteralNumber(canonicalAs) || IsLiteralString(canonicalAs) ? { [canonicalAs.const]: instantiatedProperty } : {};
}
function MappedProperties(context, state, identifier2, variants, as, property) {
  return variants.reduce((result, left) => {
    return [...result, MappedVariant(context, state, identifier2, left, as, property)];
  }, []);
}
function MappedObjects(properties2) {
  return properties2.reduce((result, left) => {
    return [...result, _Object_(left)];
  }, []);
}
function MappedOperation(context, state, identifier2, type, as, property) {
  const variants = MappedVariants(type);
  const mappedProperties = MappedProperties(context, state, identifier2, variants, as, property);
  const mappedObjects = MappedObjects(mappedProperties);
  const result = EvaluateIntersect(mappedObjects);
  return result;
}

// node_modules/typebox/build/type/engine/mapped/instantiate.mjs
function MappedAction(context, state, identifier2, type, as, property, options) {
  const result = CanInstantiate([type]) ? exports_memory.Update(MappedOperation(context, state, identifier2, type, as, property), {}, options) : MappedDeferred(identifier2, type, as, property, options);
  return result;
}
function MappedInstantiate(context, state, identifier2, type, as, property, options) {
  const instantiatedType = InstantiateType(context, state, type);
  return MappedAction(context, state, identifier2, instantiatedType, as, property, options);
}

// node_modules/typebox/build/type/engine/module/instantiate.mjs
function InstantiateCyclics(context, cyclicKeys) {
  const keys = exports_guard.Keys(context).filter((key) => cyclicKeys.includes(key));
  return keys.reduce((result, key) => {
    return { ...result, [key]: InstantiateCyclic(context, key, context[key]) };
  }, {});
}
function InstantiateNonCyclics(context, cyclicKeys) {
  const keys = exports_guard.Keys(context).filter((key) => !cyclicKeys.includes(key));
  return keys.reduce((result, key) => {
    return { ...result, [key]: InstantiateType(context, { callstack: [] }, context[key]) };
  }, {});
}
function InstantiateModule(context, options) {
  const cyclicCandidates = CyclicCandidates(context);
  const instantiatedCyclics = InstantiateCyclics(context, cyclicCandidates);
  const instantiatedNonCyclics = InstantiateNonCyclics(context, cyclicCandidates);
  const instantiatedModule = { ...instantiatedCyclics, ...instantiatedNonCyclics };
  return exports_memory.Update(instantiatedModule, {}, options);
}
function ModuleInstantiate(context, _state, properties2, options) {
  const moduleContext = exports_memory.Assign(context, properties2);
  const instantiatedModule = InstantiateModule(moduleContext, options);
  return instantiatedModule;
}

// node_modules/typebox/build/type/action/non_nullable.mjs
function NonNullableDeferred(type, options = {}) {
  return Deferred("NonNullable", [type], options);
}
function NonNullable(type, options = {}) {
  return NonNullableAction(type, options);
}

// node_modules/typebox/build/type/engine/non_nullable/instantiate.mjs
function NonNullableOperation(type) {
  const excluded = Union([Null(), Undefined()]);
  return ExcludeAction(type, excluded, {});
}
function NonNullableAction(type, options) {
  const result = CanInstantiate([type]) ? exports_memory.Update(NonNullableOperation(type), {}, options) : NonNullableDeferred(type, options);
  return result;
}
function NonNullableInstantiate(context, state, type, options) {
  const instantiatedType = InstantiateType(context, state, type);
  return NonNullableAction(instantiatedType, options);
}

// node_modules/typebox/build/type/action/omit.mjs
function OmitDeferred(type, indexer, options = {}) {
  return Deferred("Omit", [type, indexer], options);
}
function Omit(type, indexer_or_keys, options = {}) {
  const indexer = exports_guard.IsArray(indexer_or_keys) ? KeysToIndexer(indexer_or_keys) : indexer_or_keys;
  return OmitAction(type, indexer, options);
}

// node_modules/typebox/build/type/engine/indexable/to_indexable.mjs
function ToIndexable(type) {
  const collapsed = CollapseToObject(type);
  const result = IsObject2(collapsed) ? collapsed.properties : Unreachable();
  return result;
}

// node_modules/typebox/build/type/engine/omit/from_type.mjs
function FromKeys(properties2, keys) {
  const result = exports_guard.Keys(properties2).reduce((result2, key) => {
    return keys.includes(key) ? result2 : { ...result2, [key]: properties2[key] };
  }, {});
  return result;
}
function FromType14(type, indexer) {
  const indexable = ToIndexable(type);
  const indexableKeys = ToIndexableKeys(indexer);
  const omitted = FromKeys(indexable, indexableKeys);
  const result = _Object_(omitted);
  return result;
}

// node_modules/typebox/build/type/engine/omit/instantiate.mjs
function OmitAction(type, indexer, options) {
  const result = CanInstantiate([type, indexer]) ? exports_memory.Update(FromType14(type, indexer), {}, options) : OmitDeferred(type, indexer, options);
  return result;
}
function OmitInstantiate(context, state, type, indexer, options) {
  const instantiatedType = InstantiateType(context, state, type);
  const instantiatedIndexer = InstantiateType(context, state, indexer);
  return OmitAction(instantiatedType, instantiatedIndexer, options);
}

// node_modules/typebox/build/type/action/options.mjs
function OptionsDeferred(type, options) {
  return Deferred("Options", [type, options], {});
}
function Options2(type, options) {
  return OptionsAction(type, options);
}

// node_modules/typebox/build/type/engine/options/instantiate.mjs
function OptionsAction(type, options) {
  const result = CanInstantiate([type]) ? exports_memory.Update(type, {}, options) : OptionsDeferred(type, options);
  return result;
}
function OptionsInstantiate(context, state, type, options) {
  const instaniatedType = InstantiateType(context, state, type);
  return OptionsAction(instaniatedType, options);
}

// node_modules/typebox/build/type/action/parameters.mjs
function ParametersDeferred(type, options = {}) {
  return Deferred("Parameters", [type], options);
}
function Parameters(type, options = {}) {
  return ParametersAction(type, options);
}

// node_modules/typebox/build/type/engine/parameters/instantiate.mjs
function ParametersOperation(type) {
  const parameters = IsFunction2(type) ? type["parameters"] : [];
  const instantiatedParameters = InstantiateElements({}, { callstack: [] }, parameters);
  const result = Tuple(instantiatedParameters);
  return result;
}
function ParametersAction(type, options) {
  const result = CanInstantiate([type]) ? exports_memory.Update(ParametersOperation(type), {}, options) : ParametersDeferred(type, options);
  return result;
}
function ParametersInstantiate(context, state, type, options) {
  const instantiatedType = InstantiateType(context, state, type);
  return ParametersAction(instantiatedType, options);
}

// node_modules/typebox/build/type/action/partial.mjs
function PartialDeferred(type, options = {}) {
  return Deferred("Partial", [type], options);
}
function Partial(type, options = {}) {
  return PartialAction(type, options);
}

// node_modules/typebox/build/type/engine/partial/from_cyclic.mjs
function FromCyclic3(defs, ref2) {
  const target2 = CyclicTarget(defs, ref2);
  const partial = FromType15(target2);
  const result = Cyclic(exports_memory.Assign(defs, { [ref2]: partial }), ref2);
  return result;
}

// node_modules/typebox/build/type/engine/partial/from_intersect.mjs
function FromIntersect3(types) {
  const result = types.map((type) => FromType15(type));
  return EvaluateIntersect(result);
}

// node_modules/typebox/build/type/engine/partial/from_union.mjs
function FromUnion6(types) {
  const result = types.map((type) => FromType15(type));
  return Union(result);
}

// node_modules/typebox/build/type/engine/partial/from_object.mjs
function FromObject5(properties2) {
  const mapped = exports_guard.Keys(properties2).reduce((result2, left) => {
    return { ...result2, [left]: Optional(properties2[left]) };
  }, {});
  const result = _Object_(mapped);
  return result;
}

// node_modules/typebox/build/type/engine/partial/from_type.mjs
function FromType15(type) {
  return IsCyclic(type) ? FromCyclic3(type.$defs, type.$ref) : IsIntersect(type) ? FromIntersect3(type.allOf) : IsUnion(type) ? FromUnion6(type.anyOf) : IsObject2(type) ? FromObject5(type.properties) : _Object_({});
}

// node_modules/typebox/build/type/engine/partial/instantiate.mjs
function PartialAction(type, options) {
  const result = CanInstantiate([type]) ? exports_memory.Update(FromType15(type), {}, options) : PartialDeferred(type, options);
  return result;
}
function PartialInstantiate(context, state, type, options) {
  const instantiatedType = InstantiateType(context, state, type);
  return PartialAction(instantiatedType, options);
}

// node_modules/typebox/build/type/action/pick.mjs
function PickDeferred(type, indexer, options = {}) {
  return Deferred("Pick", [type, indexer], options);
}
function Pick(type, indexer_or_keys, options = {}) {
  const indexer = exports_guard.IsArray(indexer_or_keys) ? KeysToIndexer(indexer_or_keys) : indexer_or_keys;
  return PickAction(type, indexer, options);
}

// node_modules/typebox/build/type/engine/pick/from_type.mjs
function FromKeys2(properties2, keys) {
  const result = exports_guard.Keys(properties2).reduce((result2, key) => {
    return keys.includes(key) ? exports_memory.Assign(result2, { [key]: properties2[key] }) : result2;
  }, {});
  return result;
}
function FromType16(type, indexer) {
  const indexable = ToIndexable(type);
  const keys = ToIndexableKeys(indexer);
  const applied = FromKeys2(indexable, keys);
  const result = _Object_(applied);
  return result;
}

// node_modules/typebox/build/type/engine/pick/instantiate.mjs
function PickAction(type, indexer, options) {
  const result = CanInstantiate([type, indexer]) ? exports_memory.Update(FromType16(type, indexer), {}, options) : PickDeferred(type, indexer, options);
  return result;
}
function PickInstantiate(context, state, type, indexer, options) {
  const instantiatedType = InstantiateType(context, state, type);
  const instantiatedIndexer = InstantiateType(context, state, indexer);
  return PickAction(instantiatedType, instantiatedIndexer, options);
}

// node_modules/typebox/build/type/action/readonly_object.mjs
function ReadonlyObjectDeferred(type, options = {}) {
  return Deferred("ReadonlyObject", [type], options);
}
function ReadonlyObject(type, options = {}) {
  return ReadonlyObjectAction(type, options);
}
var ReadonlyType = ReadonlyObject;

// node_modules/typebox/build/type/engine/readonly_object/from_array.mjs
function FromArray4(type) {
  const result = Immutable(_Array_(type));
  return result;
}

// node_modules/typebox/build/type/engine/readonly_object/from_cyclic.mjs
function FromCyclic4(defs, ref2) {
  const target2 = CyclicTarget(defs, ref2);
  const partial = FromType17(target2);
  const result = Cyclic(exports_memory.Assign(defs, { [ref2]: partial }), ref2);
  return result;
}

// node_modules/typebox/build/type/engine/readonly_object/from_intersect.mjs
function FromIntersect4(types) {
  const result = types.map((type) => FromType17(type));
  return EvaluateIntersect(result);
}

// node_modules/typebox/build/type/engine/readonly_object/from_object.mjs
function FromObject6(properties2) {
  const mapped = exports_guard.Keys(properties2).reduce((result2, left) => {
    return { ...result2, [left]: Readonly(properties2[left]) };
  }, {});
  const result = _Object_(mapped);
  return result;
}

// node_modules/typebox/build/type/engine/readonly_object/from_tuple.mjs
function FromTuple4(types) {
  const result = Immutable(Tuple(types));
  return result;
}

// node_modules/typebox/build/type/engine/readonly_object/from_union.mjs
function FromUnion7(types) {
  const result = types.map((type) => FromType17(type));
  return Union(result);
}

// node_modules/typebox/build/type/engine/readonly_object/from_type.mjs
function FromType17(type) {
  return IsArray2(type) ? FromArray4(type.items) : IsCyclic(type) ? FromCyclic4(type.$defs, type.$ref) : IsIntersect(type) ? FromIntersect4(type.allOf) : IsObject2(type) ? FromObject6(type.properties) : IsTuple(type) ? FromTuple4(type.items) : IsUnion(type) ? FromUnion7(type.anyOf) : type;
}

// node_modules/typebox/build/type/engine/readonly_object/instantiate.mjs
function ReadonlyObjectAction(type, options) {
  const result = CanInstantiate([type]) ? exports_memory.Update(FromType17(type), {}, options) : ReadonlyObjectDeferred(type);
  return result;
}
function ReadonlyObjectInstantiate(context, state, type, options) {
  const instantiatedType = InstantiateType(context, state, type);
  return ReadonlyObjectAction(instantiatedType, options);
}

// node_modules/typebox/build/type/engine/ref/instantiate.mjs
function RefInstantiate(context, state, type, ref2) {
  return ref2 in context ? CyclicCheck([ref2], context, context[ref2]) ? type : InstantiateType(context, state, context[ref2]) : type;
}

// node_modules/typebox/build/type/engine/required/from_cyclic.mjs
function FromCyclic5(defs, ref2) {
  const target2 = CyclicTarget(defs, ref2);
  const partial = FromType18(target2);
  const result = Cyclic(exports_memory.Assign(defs, { [ref2]: partial }), ref2);
  return result;
}

// node_modules/typebox/build/type/engine/required/from_intersect.mjs
function FromIntersect5(types) {
  const result = types.map((type) => FromType18(type));
  return EvaluateIntersect(result);
}

// node_modules/typebox/build/type/engine/required/from_union.mjs
function FromUnion8(types) {
  const result = types.map((type) => FromType18(type));
  return Union(result);
}

// node_modules/typebox/build/type/engine/required/from_object.mjs
function FromObject7(properties2) {
  const mapped = exports_guard.Keys(properties2).reduce((result2, left) => {
    return { ...result2, [left]: OptionalRemove(properties2[left]) };
  }, {});
  const result = _Object_(mapped);
  return result;
}

// node_modules/typebox/build/type/engine/required/from_type.mjs
function FromType18(type) {
  return IsCyclic(type) ? FromCyclic5(type.$defs, type.$ref) : IsIntersect(type) ? FromIntersect5(type.allOf) : IsUnion(type) ? FromUnion8(type.anyOf) : IsObject2(type) ? FromObject7(type.properties) : _Object_({});
}

// node_modules/typebox/build/type/action/required.mjs
function RequiredDeferred(type, options = {}) {
  return Deferred("Required", [type], options);
}
function Required(type, options = {}) {
  return RequiredAction(type, options);
}

// node_modules/typebox/build/type/engine/required/instantiate.mjs
function RequiredAction(type, options) {
  const result = CanInstantiate([type]) ? exports_memory.Update(FromType18(type), {}, options) : RequiredDeferred(type, options);
  return result;
}
function RequiredInstantiate(context, state, type, options) {
  const instaniatedType = InstantiateType(context, state, type);
  return RequiredAction(instaniatedType, options);
}

// node_modules/typebox/build/type/action/return_type.mjs
function ReturnTypeDeferred(type, options = {}) {
  return Deferred("ReturnType", [type], options);
}
function ReturnType(type, options = {}) {
  return ReturnTypeAction(type, options);
}

// node_modules/typebox/build/type/engine/return_type/instantiate.mjs
function ReturnTypeOperation(type) {
  return IsFunction2(type) ? type["returnType"] : Never();
}
function ReturnTypeAction(type, options) {
  const result = CanInstantiate([type]) ? exports_memory.Update(ReturnTypeOperation(type), {}, options) : ReturnTypeDeferred(type, options);
  return result;
}
function ReturnTypeInstantiate(context, state, type, options = {}) {
  const instantiatedType = InstantiateType(context, state, type);
  return ReturnTypeAction(instantiatedType, options);
}

// node_modules/typebox/build/type/engine/rest/spread.mjs
function SpreadElement(type) {
  const result = IsRest(type) ? IsTuple(type.items) ? RestSpread(type.items.items) : IsInfer(type.items) ? [type] : IsRef(type.items) ? [type] : [Never()] : [type];
  return result;
}
function RestSpread(types) {
  const result = types.reduce((result2, left) => {
    return [...result2, ...SpreadElement(left)];
  }, []);
  return result;
}
// node_modules/typebox/build/type/engine/instantiate.mjs
function CanInstantiate(types) {
  return exports_guard.TakeLeft(types, (left, right) => IsRef(left) ? false : CanInstantiate(right), () => true);
}
function ModifierActions(type, readonly, optional) {
  return IsReadonlyRemoveAction(type) ? ModifierActions(type.type, "remove", optional) : IsOptionalRemoveAction(type) ? ModifierActions(type.type, readonly, "remove") : IsReadonlyAddAction(type) ? ModifierActions(type.type, "add", optional) : IsOptionalAddAction(type) ? ModifierActions(type.type, readonly, "add") : [type, readonly, optional];
}
function ApplyReadonly2(action, type) {
  return exports_guard.IsEqual(action, "remove") ? ReadonlyRemove(type) : exports_guard.IsEqual(action, "add") ? ReadonlyAdd(type) : type;
}
function ApplyOptional2(action, type) {
  return exports_guard.IsEqual(action, "remove") ? OptionalRemove(type) : exports_guard.IsEqual(action, "add") ? OptionalAdd(type) : type;
}
function InstantiateProperties(context, state, properties2) {
  return exports_guard.Keys(properties2).reduce((result, key) => {
    return { ...result, [key]: InstantiateType(context, state, properties2[key]) };
  }, {});
}
function InstantiateElements(context, state, types) {
  const elements = InstantiateTypes(context, state, types);
  const result = RestSpread(elements);
  return result;
}
function InstantiateTypes(context, state, types) {
  return types.map((type) => InstantiateType(context, state, type));
}
function InstantiateDeferred(context, state, action, parameters, options) {
  return exports_guard.IsEqual(action, "Awaited") ? AwaitedInstantiate(context, state, parameters[0], options) : exports_guard.IsEqual(action, "Capitalize") ? CapitalizeInstantiate(context, state, parameters[0], options) : exports_guard.IsEqual(action, "Conditional") ? ConditionalInstantiate(context, state, parameters[0], parameters[1], parameters[2], parameters[3], options) : exports_guard.IsEqual(action, "ConstructorParameters") ? ConstructorParametersInstantiate(context, state, parameters[0], options) : exports_guard.IsEqual(action, "Evaluate") ? EvaluateInstantiate(context, state, parameters[0], options) : exports_guard.IsEqual(action, "Exclude") ? ExcludeInstantiate(context, state, parameters[0], parameters[1], options) : exports_guard.IsEqual(action, "Extract") ? ExtractInstantiate(context, state, parameters[0], parameters[1], options) : exports_guard.IsEqual(action, "Index") ? IndexInstantiate(context, state, parameters[0], parameters[1], options) : exports_guard.IsEqual(action, "InstanceType") ? InstanceTypeInstantiate(context, state, parameters[0], options) : exports_guard.IsEqual(action, "Interface") ? InterfaceInstantiate(context, state, parameters[0], parameters[1], options) : exports_guard.IsEqual(action, "KeyOf") ? KeyOfInstantiate(context, state, parameters[0], options) : exports_guard.IsEqual(action, "Lowercase") ? LowercaseInstantiate(context, state, parameters[0], options) : exports_guard.IsEqual(action, "Mapped") ? MappedInstantiate(context, state, parameters[0], parameters[1], parameters[2], parameters[3], options) : exports_guard.IsEqual(action, "Module") ? ModuleInstantiate(context, state, parameters[0], options) : exports_guard.IsEqual(action, "NonNullable") ? NonNullableInstantiate(context, state, parameters[0], options) : exports_guard.IsEqual(action, "Pick") ? PickInstantiate(context, state, parameters[0], parameters[1], options) : exports_guard.IsEqual(action, "Options") ? OptionsInstantiate(context, state, parameters[0], parameters[1]) : exports_guard.IsEqual(action, "Parameters") ? ParametersInstantiate(context, state, parameters[0], options) : exports_guard.IsEqual(action, "Partial") ? PartialInstantiate(context, state, parameters[0], options) : exports_guard.IsEqual(action, "Omit") ? OmitInstantiate(context, state, parameters[0], parameters[1], options) : exports_guard.IsEqual(action, "ReadonlyObject") ? ReadonlyObjectInstantiate(context, state, parameters[0], options) : exports_guard.IsEqual(action, "Record") ? RecordInstantiate(context, state, parameters[0], parameters[1], options) : exports_guard.IsEqual(action, "Required") ? RequiredInstantiate(context, state, parameters[0], options) : exports_guard.IsEqual(action, "ReturnType") ? ReturnTypeInstantiate(context, state, parameters[0], options) : exports_guard.IsEqual(action, "TemplateLiteral") ? TemplateLiteralInstantiate(context, state, parameters[0], options) : exports_guard.IsEqual(action, "Uncapitalize") ? UncapitalizeInstantiate(context, state, parameters[0], options) : exports_guard.IsEqual(action, "Uppercase") ? UppercaseInstantiate(context, state, parameters[0], options) : Deferred(action, parameters, options);
}
function InstantiateType(context, state, input) {
  const immutable = IsImmutable(input);
  const modifiers = ModifierActions(input, IsReadonly(input) ? "add" : "none", IsOptional(input) ? "add" : "none");
  const type = IsBase(modifiers[0]) ? modifiers[0].Clone() : modifiers[0];
  const instantiated = IsRef(type) ? RefInstantiate(context, state, type, type.$ref) : IsArray2(type) ? _Array_(InstantiateType(context, state, type.items), ArrayOptions(type)) : IsAsyncIterator2(type) ? AsyncIterator(InstantiateType(context, state, type.iteratorItems), AsyncIteratorOptions(type)) : IsCall(type) ? CallInstantiate(context, state, type.target, type.arguments) : IsConstructor2(type) ? Constructor(InstantiateTypes(context, state, type.parameters), InstantiateType(context, state, type.instanceType), ConstructorOptions(type)) : IsDeferred(type) ? InstantiateDeferred(context, state, type.action, type.parameters, type.options) : IsFunction2(type) ? _Function_(InstantiateTypes(context, state, type.parameters), InstantiateType(context, state, type.returnType), FunctionOptions(type)) : IsIntersect(type) ? Intersect(InstantiateTypes(context, state, type.allOf), IntersectOptions(type)) : IsIterator2(type) ? Iterator(InstantiateType(context, state, type.iteratorItems), IteratorOptions(type)) : IsObject2(type) ? _Object_(InstantiateProperties(context, state, type.properties), ObjectOptions(type)) : IsPromise(type) ? _Promise_(InstantiateType(context, state, type.item), PromiseOptions(type)) : IsRecord(type) ? RecordFromPattern(RecordPattern(type), InstantiateType(context, state, RecordValue(type))) : IsRest(type) ? Rest(InstantiateType(context, state, type.items)) : IsTuple(type) ? Tuple(InstantiateElements(context, state, type.items), TupleOptions(type)) : IsUnion(type) ? Union(InstantiateTypes(context, state, type.anyOf), UnionOptions(type)) : type;
  const withImmutable = immutable ? Immutable(instantiated) : instantiated;
  const withModifiers = ApplyReadonly2(modifiers[1], ApplyOptional2(modifiers[2], withImmutable));
  return withModifiers;
}
function Instantiate(context, type) {
  return InstantiateType(context, { callstack: [] }, type);
}

// node_modules/typebox/build/type/engine/awaited/instantiate.mjs
function AwaitedOperation(type) {
  return IsPromise(type) ? AwaitedOperation(type.item) : type;
}
function AwaitedAction(type, options) {
  const result = CanInstantiate([type]) ? exports_memory.Update(AwaitedOperation(type), {}, options) : AwaitedDeferred(type, options);
  return result;
}
function AwaitedInstantiate(context, state, type, options) {
  const instantiatedType = InstantiateType(context, state, type);
  return AwaitedAction(instantiatedType, options);
}

// node_modules/typebox/build/type/action/awaited.mjs
function AwaitedDeferred(type, options = {}) {
  return Deferred("Awaited", [type], options);
}
function Awaited(type, options = {}) {
  return AwaitedAction(type, options);
}
// node_modules/typebox/build/type/action/evaluate.mjs
function EvaluateDeferred(type, options = {}) {
  return Deferred("Evaluate", [type], options);
}
function Evaluate(type, options = {}) {
  return EvaluateAction(type, options);
}
// node_modules/typebox/build/type/action/module.mjs
function ModuleDeferred(context, options = {}) {
  return Deferred("Module", [context], options);
}
function Module2(context, options = {}) {
  return Instantiate({}, ModuleDeferred(context, options));
}
// node_modules/typebox/build/type/script/script.mjs
function Script2(...args) {
  const [context, input, options3] = exports_arguments.Match(args, {
    2: (script, options4) => exports_guard.IsString(script) ? [{}, script, options4] : [script, options4, {}],
    3: (context2, script, options4) => [context2, script, options4],
    1: (script) => [{}, script, {}]
  });
  const result = Script(input);
  const parsed = exports_guard.IsArray(result) && exports_guard.IsEqual(result.length, 2) ? InstantiateType(context, { callstack: [] }, result[0]) : Never();
  return exports_memory.Update(parsed, {}, options3);
}
// node_modules/typebox/build/typebox.mjs
var exports_typebox = {};
__export(exports_typebox, {
  Void: () => Void,
  Uppercase: () => Uppercase,
  Unsafe: () => Unsafe,
  Unknown: () => Unknown,
  Union: () => Union,
  Undefined: () => Undefined,
  Uncapitalize: () => Uncapitalize,
  Tuple: () => Tuple,
  This: () => This,
  TemplateLiteral: () => TemplateLiteral2,
  Symbol: () => Symbol2,
  String: () => String2,
  Script: () => Script2,
  ReturnType: () => ReturnType,
  Rest: () => Rest,
  Required: () => Required,
  Refine: () => Refine,
  Ref: () => Ref,
  RecordValue: () => RecordValue,
  RecordPattern: () => RecordPattern,
  RecordKey: () => RecordKey,
  Record: () => Record,
  ReadonlyType: () => ReadonlyType,
  ReadonlyObject: () => ReadonlyObject,
  Readonly: () => Readonly,
  Promise: () => _Promise_,
  Pick: () => Pick,
  Partial: () => Partial,
  Parameters: () => Parameters,
  Parameter: () => Parameter,
  Options: () => Options2,
  Optional: () => Optional,
  Omit: () => Omit,
  Object: () => _Object_,
  Number: () => Number2,
  Null: () => Null,
  NonNullable: () => NonNullable,
  Never: () => Never,
  Module: () => Module2,
  Mapped: () => Mapped2,
  Lowercase: () => Lowercase,
  Literal: () => Literal,
  KeyOf: () => KeyOf2,
  Iterator: () => Iterator,
  IsVoid: () => IsVoid,
  IsUnsafe: () => IsUnsafe,
  IsUnknown: () => IsUnknown,
  IsUnion: () => IsUnion,
  IsUndefined: () => IsUndefined2,
  IsTuple: () => IsTuple,
  IsThis: () => IsThis,
  IsTemplateLiteral: () => IsTemplateLiteral,
  IsSymbol: () => IsSymbol2,
  IsString: () => IsString2,
  IsSchema: () => IsSchema,
  IsRest: () => IsRest,
  IsRefine: () => IsRefine,
  IsRef: () => IsRef,
  IsRecord: () => IsRecord,
  IsReadonly: () => IsReadonly,
  IsPromise: () => IsPromise,
  IsParameter: () => IsParameter,
  IsOptional: () => IsOptional,
  IsObject: () => IsObject2,
  IsNumber: () => IsNumber2,
  IsNull: () => IsNull2,
  IsNever: () => IsNever,
  IsLiteral: () => IsLiteral,
  IsKind: () => IsKind,
  IsIterator: () => IsIterator2,
  IsIntersect: () => IsIntersect,
  IsInteger: () => IsInteger2,
  IsInfer: () => IsInfer,
  IsImmutable: () => IsImmutable,
  IsIdentifier: () => IsIdentifier,
  IsGeneric: () => IsGeneric,
  IsFunction: () => IsFunction2,
  IsEnum: () => IsEnum,
  IsCyclic: () => IsCyclic,
  IsConstructor: () => IsConstructor2,
  IsCodec: () => IsCodec,
  IsCall: () => IsCall,
  IsBoolean: () => IsBoolean2,
  IsBigInt: () => IsBigInt2,
  IsBase: () => IsBase,
  IsAsyncIterator: () => IsAsyncIterator2,
  IsArray: () => IsArray2,
  IsAny: () => IsAny,
  Intersect: () => Intersect,
  Interface: () => Interface,
  Integer: () => Integer,
  Instantiate: () => Instantiate,
  InstanceType: () => InstanceType,
  Infer: () => Infer,
  Index: () => Index,
  Immutable: () => Immutable,
  Identifier: () => Identifier,
  Generic: () => Generic,
  Function: () => _Function_,
  Extract: () => Extract,
  ExtendsResult: () => exports_result,
  Extends: () => Extends2,
  Exclude: () => Exclude,
  Evaluate: () => Evaluate,
  Enum: () => Enum,
  EncodeBuilder: () => EncodeBuilder,
  Encode: () => Encode,
  DecodeBuilder: () => DecodeBuilder,
  Decode: () => Decode,
  Cyclic: () => Cyclic,
  ConstructorParameters: () => ConstructorParameters,
  Constructor: () => Constructor,
  Conditional: () => Conditional,
  Codec: () => Codec,
  Capitalize: () => Capitalize,
  Call: () => Call,
  Boolean: () => Boolean2,
  BigInt: () => BigInt2,
  Base: () => Base,
  Awaited: () => Awaited,
  AsyncIterator: () => AsyncIterator,
  Array: () => _Array_,
  Any: () => Any
});
// src/policy/workspace.ts
function workspaceOf(id) {
  if (!id)
    return null;
  const match = /^([^:]+):p[0-9A-Za-z]+$/.exec(id);
  return match?.[1] ?? null;
}
function sameWorkspace(a, b) {
  return a !== null && a !== undefined && b !== null && b !== undefined && a === b;
}
function checkWall(ownKey, targetKey, opts) {
  const ownWorkspace = workspaceOf(ownKey);
  if (ownWorkspace === null)
    return { allowed: true };
  const targetWorkspace = workspaceOf(targetKey);
  if (sameWorkspace(ownWorkspace, targetWorkspace))
    return { allowed: true };
  if (opts.crossWorkspace === true)
    return { allowed: true };
  return {
    allowed: false,
    reason: `workspace wall: target ${targetKey ?? "unknown"} is outside workspace ${ownWorkspace}`
  };
}
function scopeToWorkspace(items, keyOf, currentWs, opts) {
  if (opts.all || currentWs === null)
    return items;
  return items.filter((item) => sameWorkspace(workspaceOf(keyOf(item)), currentWs));
}

// src/config.ts
import * as filesystem from "node:fs";
import * as path from "node:path";

// src/util.ts
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

// src/config.ts
function stripComment(line) {
  let quoted = false;
  let escaped = false;
  for (let index = 0;index < line.length; index++) {
    const character = line[index];
    if (quoted && escaped)
      escaped = false;
    else if (quoted && character === "\\")
      escaped = true;
    else if (character === '"')
      quoted = !quoted;
    else if (!quoted && character === "#")
      return line.slice(0, index);
  }
  return line;
}
function splitValues(value) {
  const values = [];
  let quoted = false;
  let escaped = false;
  let start = 0;
  for (let index = 0;index < value.length; index++) {
    const character = value[index];
    if (quoted && escaped)
      escaped = false;
    else if (quoted && character === "\\")
      escaped = true;
    else if (character === '"')
      quoted = !quoted;
    else if (!quoted && character === ",") {
      values.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  if (quoted)
    throw new Error("unterminated string");
  values.push(value.slice(start).trim());
  return values;
}
function parseValue(value, line) {
  if (value.startsWith('"')) {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed !== "string")
        throw new Error;
      return parsed;
    } catch {
      throw new Error(`line ${line}: invalid string`);
    }
  }
  if (value === "true")
    return true;
  if (value === "false")
    return false;
  if (/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(value))
    return Number(value);
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner)
      return [];
    const entries = splitValues(inner).map((entry) => parseValue(entry, line));
    if (!entries.every((entry) => typeof entry === "string")) {
      throw new Error(`line ${line}: arrays may contain only strings`);
    }
    return entries;
  }
  throw new Error(`line ${line}: unsupported value`);
}
function tableAt(root, parts, line) {
  let current = root;
  for (const part of parts) {
    if (!part)
      throw new Error(`line ${line}: invalid table name`);
    const existing = current[part];
    if (existing === undefined)
      current[part] = {};
    else if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
      throw new Error(`line ${line}: ${part} is not a table`);
    }
    current = current[part];
  }
  return current;
}
function parseFallbackToml(text) {
  const root = {};
  let current = root;
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  for (let index = 0;index < lines.length; index++) {
    const lineNumber = index + 1;
    const line = stripComment(lines[index]).trim();
    if (!line)
      continue;
    const arrayTable = line.match(/^\[\[([^\]]+)\]\]$/);
    if (arrayTable) {
      const parts = arrayTable[1].split(".").map((part) => part.trim());
      const key2 = parts.pop();
      if (!key2 || parts.some((part) => !part))
        throw new Error(`line ${lineNumber}: invalid table name`);
      const parent = tableAt(root, parts, lineNumber);
      if (parent[key2] === undefined)
        parent[key2] = [];
      if (!Array.isArray(parent[key2]))
        throw new Error(`line ${lineNumber}: ${key2} is not an array`);
      current = {};
      parent[key2].push(current);
      continue;
    }
    const table = line.match(/^\[([^\]]+)\]$/);
    if (table) {
      current = tableAt(root, table[1].split(".").map((part) => part.trim()), lineNumber);
      continue;
    }
    const equals = line.indexOf("=");
    if (equals < 1)
      throw new Error(`line ${lineNumber}: expected key = value`);
    const key = line.slice(0, equals).trim();
    if (!/^[A-Za-z0-9_-]+$/.test(key))
      throw new Error(`line ${lineNumber}: invalid key ${key}`);
    current[key] = parseValue(line.slice(equals + 1).trim(), lineNumber);
  }
  return root;
}
function parseToml(text) {
  const bunToml = globalThis.Bun?.TOML;
  return bunToml?.parse ? bunToml.parse(text) : parseFallbackToml(text);
}
function found(value) {
  if (value === undefined)
    return "missing";
  if (Array.isArray(value))
    return "array";
  if (value === null)
    return "null";
  return typeof value;
}
function fail(file, key, expected, value) {
  throw new Error(`${file}: ${key}: expected ${expected}, found ${found(value)}`);
}
function warn(file, key) {
  process.stderr.write(`orch: ignoring unknown config key ${key} in ${file}
`);
}
function table(value, file, key) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail(file, key, "table", value);
  return value;
}
function knownKeys(value, file, prefix, keys2) {
  for (const key of Object.keys(value)) {
    if (!keys2.includes(key))
      warn(file, prefix ? `${prefix}.${key}` : key);
  }
}
function loadConfig(orchDir) {
  const file = path.join(orchDir, "config.toml");
  let root;
  try {
    root = parseToml(filesystem.readFileSync(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      return { defaults: {}, queue: { max_retries: 1 }, notify: [], hosts: {}, workspaces: {} };
    }
    throw new Error(`${file}: config: expected valid TOML, found ${errorMessage(error)}`);
  }
  knownKeys(root, file, "", ["defaults", "queue", "notify", "hosts", "workspaces"]);
  const defaults = {};
  if (root.defaults !== undefined) {
    const source = table(root.defaults, file, "defaults");
    knownKeys(source, file, "defaults", ["adapter", "backend", "model", "allowed_models", "spawn_cap", "worktree", "worker_peer_tools"]);
    for (const key of ["adapter", "backend", "model"]) {
      if (source[key] !== undefined) {
        if (typeof source[key] !== "string")
          fail(file, `defaults.${key}`, "string", source[key]);
        defaults[key] = source[key];
      }
    }
    if (source.allowed_models !== undefined) {
      if (!Array.isArray(source.allowed_models) || !source.allowed_models.every((entry) => typeof entry === "string")) {
        fail(file, "defaults.allowed_models", "string array", source.allowed_models);
      }
      defaults.allowed_models = source.allowed_models;
    }
    if (source.spawn_cap !== undefined) {
      if (typeof source.spawn_cap !== "number")
        fail(file, "defaults.spawn_cap", "number", source.spawn_cap);
      defaults.spawn_cap = source.spawn_cap;
    }
    if (source.worktree !== undefined) {
      if (typeof source.worktree !== "boolean")
        fail(file, "defaults.worktree", "boolean", source.worktree);
      defaults.worktree = source.worktree;
    }
    if (source.worker_peer_tools !== undefined) {
      if (typeof source.worker_peer_tools !== "boolean")
        fail(file, "defaults.worker_peer_tools", "boolean", source.worker_peer_tools);
      defaults.worker_peer_tools = source.worker_peer_tools;
    }
  }
  const queue = { max_retries: 1 };
  if (root.queue !== undefined) {
    const source = table(root.queue, file, "queue");
    knownKeys(source, file, "queue", ["max_retries"]);
    if (source.max_retries !== undefined) {
      if (typeof source.max_retries !== "number")
        fail(file, "queue.max_retries", "number", source.max_retries);
      queue.max_retries = source.max_retries;
    }
  }
  let notify = [];
  if (root.notify !== undefined) {
    if (!Array.isArray(root.notify))
      fail(file, "notify", "array", root.notify);
    notify = root.notify;
  }
  const hosts = {};
  if (root.hosts !== undefined) {
    const source = table(root.hosts, file, "hosts");
    for (const [name, host] of Object.entries(source)) {
      const hostTable = table(host, file, `hosts.${name}`);
      knownKeys(hostTable, file, `hosts.${name}`, ["dest", "ssh", "orch_dir", "timeout_ms"]);
      const destination = hostTable.dest ?? hostTable.ssh;
      if (typeof destination !== "string")
        fail(file, `hosts.${name}.dest`, "string", destination);
      if (hostTable.orch_dir !== undefined && typeof hostTable.orch_dir !== "string") {
        fail(file, `hosts.${name}.orch_dir`, "string", hostTable.orch_dir);
      }
      if (hostTable.timeout_ms !== undefined && (typeof hostTable.timeout_ms !== "number" || !Number.isFinite(hostTable.timeout_ms) || hostTable.timeout_ms <= 0 || !Number.isInteger(hostTable.timeout_ms))) {
        throw new Error(`${file}: hosts.${name}.timeout_ms: expected a positive integer, found ${found(hostTable.timeout_ms)}`);
      }
      const parsed = {};
      if (hostTable.dest !== undefined)
        parsed.dest = destination;
      else
        parsed.ssh = destination;
      if (typeof hostTable.orch_dir === "string")
        parsed.orch_dir = hostTable.orch_dir;
      if (typeof hostTable.timeout_ms === "number")
        parsed.timeout_ms = hostTable.timeout_ms;
      hosts[name] = parsed;
    }
  }
  const workspaces = {};
  if (root.workspaces !== undefined) {
    const source = table(root.workspaces, file, "workspaces");
    for (const [id, name] of Object.entries(source)) {
      if (typeof name !== "string")
        fail(file, `workspaces.${id}`, "string", name);
      workspaces[id] = name;
    }
  }
  return { defaults, queue, notify, hosts, workspaces };
}
var DEFAULT_ALLOWED_MODELS = ["openrouter/moonshotai/kimi-k2.7-code", "openrouter/x-ai/grok-4.5"];
function allowedModelPatterns(orchDir) {
  try {
    const patterns2 = loadConfig(orchDir).defaults.allowed_models;
    if (patterns2 && patterns2.length)
      return patterns2;
  } catch {}
  return DEFAULT_ALLOWED_MODELS;
}

// extensions/orchestrator-bridge.ts
function hashExtensionFile(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex").slice(0, 12);
}
var EXTENSION_HASH = hashExtensionFile(fileURLToPath(import.meta.url));
var ORCH_DIR = process.env.ORCH_DIR ?? path2.join(os.homedir(), ".orch");
var PRESENCE_ROOT = path2.join(ORCH_DIR, "agents");
var SCHEMA_VERSION = 2;
var AGENT_ID = "pi";
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isUnknownArray(value) {
  return Array.isArray(value);
}
function optionalString(value) {
  return typeof value === "string" ? value : undefined;
}
function isTextBlock(value) {
  return isRecord(value) && value.type === "text" && typeof value.text === "string";
}
function isUsageLike(value) {
  if (!isRecord(value))
    return false;
  if (value.input !== undefined && typeof value.input !== "number")
    return false;
  if (value.output !== undefined && typeof value.output !== "number")
    return false;
  if (value.cacheRead !== undefined && typeof value.cacheRead !== "number")
    return false;
  if (value.cacheWrite !== undefined && typeof value.cacheWrite !== "number")
    return false;
  if (value.cost === undefined)
    return true;
  return isRecord(value.cost) && (value.cost.total === undefined || typeof value.cost.total === "number");
}
function isAssistantMessageLike(value) {
  if (!isRecord(value) || value.role !== "assistant" || !("content" in value))
    return false;
  if (value.usage !== undefined && !isUsageLike(value.usage))
    return false;
  if (value.stopReason !== undefined && typeof value.stopReason !== "string")
    return false;
  return value.errorMessage === undefined || typeof value.errorMessage === "string";
}
function isControlCommand(value) {
  return isRecord(value) && typeof value.cmd === "string";
}
function isThinkingLevel(value) {
  return value === "off" || value === "minimal" || value === "low" || value === "medium" || value === "high" || value === "xhigh" || value === "max";
}
function isModelSelectEvent(value) {
  return isRecord(value) && "model" in value;
}
function isThinkingLevelSelectEvent(value) {
  return isRecord(value) && "level" in value;
}
function isBeforeAgentStartEvent(value) {
  return isRecord(value) && "prompt" in value;
}
function isMessageEndEvent(value) {
  return isRecord(value) && "message" in value;
}
function isAgentEndEvent(value) {
  return isRecord(value) && "messages" in value;
}
function isToolExecutionStartEvent(value) {
  return isRecord(value) && "toolName" in value && "args" in value;
}
function isHerdrBlockedEvent(value) {
  return isRecord(value) && typeof value.active === "boolean" && (value.label === undefined || typeof value.label === "string");
}
function computeKey(hasUI) {
  if (hasUI && process.env.HERDR_PANE_ID)
    return process.env.HERDR_PANE_ID;
  return `session-${process.pid}`;
}
function presenceDirectoryName(key) {
  if (process.platform !== "win32")
    return key;
  return key.replaceAll("%", "%25").replaceAll(":", "%3A");
}
function presenceKeyFromDirectoryName(name) {
  if (process.platform !== "win32")
    return name;
  return name.replace(/%25|%3A/g, (token) => token === "%25" ? "%" : ":");
}
function presenceAgentDir(key) {
  return path2.join(PRESENCE_ROOT, presenceDirectoryName(key));
}
var LAST_TEXT_MAX = 400;
var TASK_MAX = 200;
var HEARTBEAT_MS = 3000;
var INBOX_POLL_MS = 1000;
var HERDR_ENV = process.env.HERDR_ENV;
var HERDR_SOCKET_PATH = process.env.HERDR_SOCKET_PATH;
var HERDR_PANE_ID = process.env.HERDR_PANE_ID;
var HERDR_METADATA_SOURCE = "orch:bridge";
var CUSTOM_STATUS_MAX = 32;
var metadataSeq = Date.now() * 1000;
function nextMetadataSeq() {
  metadataSeq += 1;
  return metadataSeq;
}
function sendHerdrMetadata(customStatus) {
  if (HERDR_ENV !== "1" || !HERDR_SOCKET_PATH || !HERDR_PANE_ID)
    return;
  try {
    const request = {
      id: `${HERDR_METADATA_SOURCE}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      method: "pane.report_metadata",
      params: {
        pane_id: HERDR_PANE_ID,
        source: HERDR_METADATA_SOURCE,
        custom_status: customStatus,
        seq: nextMetadataSeq()
      }
    };
    let done = false;
    const socket = createConnection(HERDR_SOCKET_PATH);
    const finish = () => {
      if (done)
        return;
      done = true;
      socket.destroy();
    };
    socket.on("error", finish);
    socket.on("connect", () => socket.write(`${JSON.stringify(request)}
`));
    socket.on("data", finish);
    socket.on("end", finish);
    const timeout = setTimeout(finish, 500);
    timeout.unref?.();
  } catch {}
}
function notifyHerdr(title, body) {
  try {
    execFile("herdr", ["notification", "show", title, "--body", body, "--sound", "request", "--position", "bottom-left"], () => {});
  } catch {}
}
function extractText(content) {
  if (typeof content === "string")
    return content;
  if (!isUnknownArray(content))
    return "";
  return content.filter(isTextBlock).map((block) => block.text).join(`
`);
}
function truncate(text, max) {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}
function atomicWrite(file, data) {
  try {
    const tmp = `${file}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, file);
  } catch {}
}
function orchestrator_bridge_default(pi) {
  let dir;
  let statusFile = "";
  let resultFile = "";
  let inboxFile = "";
  let controlFile = "";
  let ackFile = "";
  let lastCtx;
  const state = {
    schema: SCHEMA_VERSION,
    agent: AGENT_ID,
    key: "",
    paneId: process.env.HERDR_PANE_ID ?? null,
    label: null,
    tabLabel: null,
    pid: process.pid,
    cwd: process.cwd(),
    state: "idle",
    lastError: undefined,
    model: undefined,
    thinking: undefined,
    lastTool: undefined,
    task: undefined,
    lastText: undefined,
    currentFile: undefined,
    tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    cost: 0,
    context: undefined,
    turns: 0,
    sessionPath: undefined,
    sessionId: undefined,
    startedAt: undefined,
    finishedAt: undefined,
    updatedAt: new Date().toISOString(),
    steersReceived: 0,
    pendingHandoff: undefined,
    handoffError: undefined,
    asking: undefined
  };
  let lastFullText;
  let runFullText;
  let pendingHandoff;
  let askingPreviousState;
  let blockedCount = 0;
  let blockedMessage;
  let blockedNotified = false;
  let lastCustomStatus;
  function metadataEnabledForState() {
    return HERDR_ENV === "1" && !!HERDR_SOCKET_PATH && !!HERDR_PANE_ID && !!state.paneId && state.key === state.paneId;
  }
  function currentCustomStatus() {
    if (state.state === "working" && state.task) {
      return truncate(state.task, CUSTOM_STATUS_MAX).slice(0, CUSTOM_STATUS_MAX);
    }
    if ((state.state === "done" || state.state === "idle") && state.cost > 0) {
      return `$${state.cost.toFixed(2)}`;
    }
    return;
  }
  function reportHerdrMetadata() {
    if (!metadataEnabledForState())
      return;
    const customStatus = currentCustomStatus();
    if (!customStatus || customStatus === lastCustomStatus)
      return;
    lastCustomStatus = customStatus;
    sendHerdrMetadata(customStatus);
  }
  function writeStatus() {
    if (!dir)
      return;
    state.updatedAt = new Date().toISOString();
    const out = { ...state, extensionHash: EXTENSION_HASH };
    if (blockedCount > 0) {
      out.state = "blocked";
      out.blockedMessage = blockedMessage;
    }
    atomicWrite(statusFile, out);
    reportHerdrMetadata();
  }
  function runHerdrJson(args) {
    return new Promise((resolve) => {
      try {
        execFile("herdr", args, { timeout: 2000 }, (_error, stdout) => {
          try {
            resolve(JSON.parse(String(stdout)));
          } catch {
            resolve(undefined);
          }
        });
      } catch {
        resolve(undefined);
      }
    });
  }
  function herdrCollection(output, name) {
    if (!isRecord(output))
      return;
    const result = output.result;
    return isRecord(result) && result[name] !== undefined ? result[name] : output[name];
  }
  function isHerdrEntity(value) {
    return isRecord(value) && (value.pane_id === undefined || typeof value.pane_id === "string") && (value.tab_id === undefined || typeof value.tab_id === "string") && (value.label === undefined || typeof value.label === "string");
  }
  function findHerdrPane(panes) {
    if (!isUnknownArray(panes))
      return;
    return panes.find((candidate) => isHerdrEntity(candidate) && candidate.pane_id === HERDR_PANE_ID);
  }
  function findPaneTab(tabs, pane) {
    if (!isUnknownArray(tabs) || typeof pane?.tab_id !== "string")
      return;
    return tabs.find((candidate) => isHerdrEntity(candidate) && candidate.tab_id === pane.tab_id);
  }
  async function readHerdrIdentity() {
    if (!HERDR_PANE_ID)
      return;
    try {
      const [paneOutput, tabOutput] = await Promise.all([
        runHerdrJson(["pane", "list"]),
        runHerdrJson(["tab", "list"])
      ]);
      const pane = findHerdrPane(herdrCollection(paneOutput, "panes"));
      const tab = findPaneTab(herdrCollection(tabOutput, "tabs"), pane);
      state.label = optionalString(pane?.label) ?? null;
      state.tabLabel = optionalString(tab?.label) ?? null;
    } catch {}
    writeStatus();
  }
  function updateSessionRef(ctx) {
    try {
      const file = ctx.sessionManager.getSessionFile();
      if (typeof file === "string" && file.startsWith("/"))
        state.sessionPath = file;
    } catch {}
    try {
      const id = ctx.sessionManager.getSessionId();
      if (id)
        state.sessionId = id;
    } catch {}
  }
  function updateModel(ctx) {
    try {
      const model = ctx.model;
      if (model)
        state.model = { provider: model.provider, id: model.id };
    } catch {}
    try {
      state.thinking = pi.getThinkingLevel();
    } catch {}
  }
  function updateContextUsage(ctx) {
    try {
      const usage = ctx.getContextUsage();
      if (usage && typeof usage.tokens === "number") {
        state.context = {
          tokens: usage.tokens,
          percent: typeof usage.percent === "number" ? usage.percent : undefined
        };
      }
    } catch {}
  }
  let poll;
  let heartbeat;
  let watcher;
  function globToRegex(pattern2) {
    const escaped = pattern2.replace(/[.+^${}()|[\]\\]/g, (char) => `\\${char}`);
    return new RegExp(`^${escaped.replace(/\*/g, ".*")}$`);
  }
  function isAllowedModel(requestedModel) {
    if (requestedModel.startsWith("openai-codex/"))
      return true;
    for (const pattern2 of allowedModelPatterns(ORCH_DIR)) {
      if (globToRegex(pattern2).test(requestedModel))
        return true;
    }
    return false;
  }
  async function resolveRequestedModel(requestedModel) {
    if (typeof requestedModel !== "string")
      throw new Error("Model must be a provider/id string");
    const slash = requestedModel.indexOf("/");
    if (slash <= 0 || slash === requestedModel.length - 1) {
      throw new Error("Model must be a provider/id string");
    }
    if (!isAllowedModel(requestedModel)) {
      throw new Error(`Model not allowed: ${requestedModel}`);
    }
    const provider = requestedModel.slice(0, slash);
    const id = requestedModel.slice(slash + 1);
    let model;
    for (let attempt = 0;attempt < 8 && !model; attempt++) {
      model = lastCtx?.modelRegistry.find(provider, id);
      if (!model)
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (!model)
      throw new Error(`Model not in registry (session still booting?): ${requestedModel}`);
    return model;
  }
  function applyRequestedThinkingLevel(level) {
    if (!isThinkingLevel(level))
      throw new Error("Thinking level must be valid");
    pi.setThinkingLevel(level);
  }
  async function applyControlCommand(parsed) {
    const requested = parsed.cmd === "model" ? { model: parsed.model } : { thinking: parsed.level };
    const outcome = { requested, success: false, ts: new Date().toISOString() };
    try {
      if (parsed.cmd === "model") {
        await pi.setModel(await resolveRequestedModel(parsed.model));
      } else {
        applyRequestedThinkingLevel(parsed.level);
      }
      outcome.success = true;
    } catch (error) {
      outcome.error = error instanceof Error ? error.message : String(error);
    }
    atomicWrite(controlFile, outcome);
    if (lastCtx)
      updateModel(lastCtx);
    writeStatus();
  }
  function parseInboxLine(line) {
    const trimmed = line.trim();
    if (!trimmed)
      return;
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }
  async function routeInboxCommand(parsed) {
    if (!isRecord(parsed) || typeof parsed.cmd !== "string")
      return false;
    if ((parsed.cmd === "model" || parsed.cmd === "thinking") && isControlCommand(parsed)) {
      await applyControlCommand(parsed);
    } else if (parsed.cmd === "on_done" && typeof parsed.target === "string" && parsed.target.trim()) {
      const target2 = parsed.target.trim();
      pendingHandoff = {
        target: target2,
        note: typeof parsed.note === "string" ? parsed.note : undefined
      };
      state.pendingHandoff = target2;
      state.handoffError = undefined;
    }
    return true;
  }
  function deliverSteerText(text) {
    state.steersReceived += 1;
    try {
      const idle = lastCtx?.isIdle() ?? true;
      if (idle) {
        pi.sendUserMessage(text);
      } else {
        pi.sendUserMessage(text, { deliverAs: "steer" });
      }
    } catch {}
  }
  const ackedMessageIds = new Set;
  function messageIdOf(parsed) {
    if (!isRecord(parsed) || typeof parsed.id !== "string" || !parsed.id)
      return;
    return parsed.id;
  }
  function appendAckMarker(id) {
    if (!ackFile)
      return;
    try {
      fs.appendFileSync(ackFile, `${JSON.stringify({ id, key: state.key, ts: new Date().toISOString() })}
`);
    } catch {}
  }
  async function applyInboxMessage(parsed) {
    if (await routeInboxCommand(parsed))
      return;
    const text = typeof parsed === "string" ? parsed : isRecord(parsed) && typeof parsed.text === "string" ? parsed.text : undefined;
    if (text)
      deliverSteerText(text);
  }
  async function routeInboxLine(line) {
    const parsed = parseInboxLine(line);
    const messageId = messageIdOf(parsed);
    if (messageId !== undefined && ackedMessageIds.has(messageId))
      return;
    await applyInboxMessage(parsed);
    if (messageId !== undefined) {
      ackedMessageIds.add(messageId);
      appendAckMarker(messageId);
    }
  }
  async function drainInbox() {
    if (!dir)
      return;
    const claim = `${inboxFile}.${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.draining`;
    try {
      fs.renameSync(inboxFile, claim);
    } catch {
      return;
    }
    let chunk = "";
    try {
      chunk = fs.readFileSync(claim, "utf8");
    } catch {} finally {
      try {
        fs.unlinkSync(claim);
      } catch {}
    }
    for (const line of chunk.split(`
`))
      await routeInboxLine(line);
    writeStatus();
  }
  function initPresence(hasUI) {
    if (dir)
      return;
    const key = computeKey(hasUI);
    const candidate = presenceAgentDir(key);
    try {
      fs.mkdirSync(candidate, { recursive: true });
    } catch {
      return;
    }
    dir = candidate;
    state.key = key;
    statusFile = path2.join(dir, "status.json");
    resultFile = path2.join(dir, "result.json");
    inboxFile = path2.join(dir, "inbox.jsonl");
    controlFile = path2.join(dir, "control.json");
    ackFile = path2.join(dir, "ack.jsonl");
    try {
      fs.writeFileSync(inboxFile, "");
    } catch {}
    poll = setInterval(() => {
      drainInbox().catch(() => {});
    }, INBOX_POLL_MS);
    poll.unref?.();
    try {
      watcher = fs.watch(dir, (_ev, filename) => {
        if (filename === "inbox.jsonl")
          drainInbox().catch(() => {});
      });
      watcher.unref?.();
    } catch {}
  }
  function readJson(file) {
    try {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      return;
    }
  }
  function isPidAlive(pid) {
    if (typeof pid !== "number" || !Number.isInteger(pid) || pid <= 0)
      return false;
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }
  function peerModel(status) {
    if (!isRecord(status) || !isRecord(status.model))
      return;
    const provider = optionalString(status.model.provider);
    const id = optionalString(status.model.id);
    if (!provider || !id)
      return;
    const thinking = optionalString(status.thinking) ?? "";
    return `${provider}/${id}:${thinking}`;
  }
  function workspaceLabel(workspace) {
    return workspace ?? "unknown";
  }
  function blockedNotificationTitle(summary) {
    const workspace = workspaceLabel(workspaceOf(state.key));
    const agentName = state.label ?? state.agent ?? state.key;
    const normalizedSummary = String(summary).replace(/\s+/g, " ").trim().replace(/^Q:\s*/i, "").slice(0, 60);
    return `BLOCKED [${workspace}] ${agentName}: ${normalizedSummary}`;
  }
  function livePeers(ownKey, allWorkspaces = false) {
    try {
      const peers = fs.readdirSync(PRESENCE_ROOT, { withFileTypes: true }).filter((entry) => entry.isDirectory() && presenceKeyFromDirectoryName(entry.name) !== ownKey).map((entry) => {
        const key = presenceKeyFromDirectoryName(entry.name);
        const peerDir = presenceAgentDir(key);
        const status = readJson(path2.join(peerDir, "status.json"));
        return { key, dir: peerDir, status };
      }).filter((peer) => isRecord(peer.status) && isPidAlive(peer.status.pid));
      return scopeToWorkspace(peers, (peer) => peer.key, workspaceOf(ownKey), { all: allWorkspaces });
    } catch {
      return [];
    }
  }
  function resolvePeer(target2, ownKey, allWorkspaces = false) {
    const peers = livePeers(ownKey, true);
    const exact = peers.find((peer) => peer.key === target2);
    const matches = exact ? [exact] : peers.filter((peer) => peer.key.endsWith(target2));
    const firstMatch = matches[0];
    if (matches.length === 1 && firstMatch) {
      const wall = checkWall(ownKey, firstMatch.key, { crossWorkspace: allWorkspaces });
      if (!wall.allowed)
        return { error: `error: ${wall.reason}` };
    }
    const scopedMatches = scopeToWorkspace(matches, (peer) => peer.key, workspaceOf(ownKey), { all: allWorkspaces });
    const firstScopedMatch = scopedMatches[0];
    if (scopedMatches.length === 1 && firstScopedMatch)
      return { peer: firstScopedMatch };
    if (scopedMatches.length > 1) {
      return { error: `error: ambiguous target. Candidates: ${scopedMatches.map((peer) => peer.key).join(", ")}` };
    }
    if (matches.length > 1) {
      return { error: `error: ambiguous target. Candidates: ${matches.map((peer) => peer.key).join(", ")}` };
    }
    const candidates2 = livePeers(ownKey, allWorkspaces);
    return { error: `error: target not found. Candidates: ${candidates2.map((peer) => peer.key).join(", ")}` };
  }
  function ownPresenceKey(ctx) {
    initPresence(ctx.hasUI);
    return state.key || computeKey(ctx.hasUI);
  }
  function peerSummaries(ownKey, allWorkspaces = false) {
    return livePeers(ownKey, allWorkspaces).map((peer) => ({
      key: peer.key,
      workspace: workspaceOf(peer.key),
      state: optionalString(peer.status.state) ?? "unknown",
      model: peerModel(peer.status),
      task: optionalString(peer.status.task),
      lastText: truncate(String(peer.status.lastText ?? ""), 120),
      cost: typeof peer.status.cost === "number" ? peer.status.cost : undefined,
      updatedAt: optionalString(peer.status.updatedAt)
    }));
  }
  function sendPeerMessage(target2, text, ownKey, allWorkspaces = false) {
    const resolved = resolvePeer(target2, ownKey, allWorkspaces);
    if ("error" in resolved)
      return resolved.error;
    fs.appendFileSync(path2.join(resolved.peer.dir, "inbox.jsonl"), `${JSON.stringify({ text: `[from ${ownKey}] ${text}`, ts: new Date().toISOString() })}
`);
    return `sent to ${resolved.peer.key}`;
  }
  function formatPeerLines(peers) {
    return peers.map((peer) => `${peer.key} ${peer.state} ${peer.model ?? "-"} ${truncate(String(peer.task ?? ""), 40)}`).join(`
`);
  }
  function clearPendingHandoff() {
    pendingHandoff = undefined;
    state.pendingHandoff = undefined;
  }
  function deliverPendingHandoff(finalText, ownKey) {
    const handoff = pendingHandoff;
    if (!handoff)
      return;
    try {
      const resolved = resolvePeer(handoff.target, ownKey);
      if ("error" in resolved) {
        state.handoffError = resolved.error;
        clearPendingHandoff();
        return;
      }
      const note = handoff.note ? `${handoff.note}
` : "";
      fs.appendFileSync(path2.join(resolved.peer.dir, "inbox.jsonl"), `${JSON.stringify({ text: `[result from ${ownKey}] ${note}${finalText}`, ts: new Date().toISOString() })}
`);
      state.handoffError = undefined;
      clearPendingHandoff();
    } catch {
      clearPendingHandoff();
    }
  }
  function waitForOrchestratorAnswer(answerFile, signal, reNotify) {
    return new Promise((resolve) => {
      let settled = false;
      let lastNotificationAt = Date.now();
      const finish = (text) => {
        if (settled)
          return;
        settled = true;
        clearInterval(poll2);
        clearTimeout(timeout);
        try {
          signal?.removeEventListener("abort", onAbort);
        } catch {}
        resolve(text);
      };
      const check2 = () => {
        const answer = readJson(answerFile);
        if (isRecord(answer) && typeof answer.text === "string") {
          finish(answer.text);
          return;
        }
        if (Date.now() - lastNotificationAt >= 60 * 1000) {
          reNotify();
          lastNotificationAt = Date.now();
        }
      };
      const onAbort = () => finish();
      const poll2 = setInterval(check2, 500);
      const timeout = setTimeout(() => finish(), 10 * 60 * 1000);
      try {
        signal?.addEventListener("abort", onAbort, { once: true });
      } catch {}
      if (signal?.aborted)
        onAbort();
    });
  }
  function toolResult(text) {
    return { content: [{ type: "text", text }], details: undefined };
  }
  function noOrchestratorAnswer() {
    return toolResult("no answer from orchestrator (timeout) — proceed with your best judgment and note the open question in your final reply.");
  }
  async function executeTool(action2, error) {
    try {
      return toolResult(await action2());
    } catch {
      return toolResult(error);
    }
  }
  function writeResult(text, details = {}) {
    atomicWrite(resultFile, {
      schema: SCHEMA_VERSION,
      text,
      ...details,
      task: state.task,
      model: state.model,
      thinking: state.thinking,
      tokens: state.tokens,
      cost: state.cost,
      turns: state.turns,
      sessionPath: state.sessionPath,
      finishedAt: state.finishedAt
    });
  }
  pi.registerCommand("peers", {
    description: "List live orch peer agents",
    handler: async (_args, ctx) => {
      try {
        const peers = peerSummaries(ownPresenceKey(ctx));
        ctx.ui.notify(peers.length ? formatPeerLines(peers) : "no live peers", "info");
      } catch {
        ctx.ui.notify("no live peers", "info");
      }
    }
  });
  pi.registerCommand("tell", {
    description: "Send a message to a peer agent: /tell <target> <message>",
    handler: async (args, ctx) => {
      try {
        const [target2, ...message] = String(args ?? "").trim().split(/\s+/);
        const text = message.join(" ");
        if (!target2 || !text) {
          ctx.ui.notify("error: usage /tell <target> <message>", "error");
          return;
        }
        const result = sendPeerMessage(target2, text, ownPresenceKey(ctx));
        ctx.ui.notify(result, result.startsWith("sent to ") ? "info" : "error");
      } catch {
        ctx.ui.notify("error: unable to send peer message", "error");
      }
    }
  });
  pi.registerTool({
    name: "orch_ask",
    label: "Ask Orchestrator",
    description: "Ask the orchestrator a blocking question and wait for its answer.",
    promptSnippet: "Ask the orchestrator a blocking decision question and wait for its answer",
    promptGuidelines: ["Use orch_ask when blocked on a decision the orchestrator must make (ambiguous spec, missing file, risky choice) — it blocks until the orchestrator answers; do not use it for things you can verify yourself."],
    parameters: exports_typebox.Object({
      question: exports_typebox.String({ description: "Decision question for the orchestrator" })
    }),
    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      try {
        ownPresenceKey(ctx);
        if (!dir)
          return noOrchestratorAnswer();
        const id = Math.random().toString(36).slice(2, 10);
        const ts = new Date().toISOString();
        const questionFile = path2.join(dir, "question.json");
        const answerFile = path2.join(dir, "answer.json");
        try {
          fs.unlinkSync(answerFile);
        } catch {}
        atomicWrite(questionFile, { question: params.question, ts, id });
        askingPreviousState = state.state;
        state.asking = { question: truncate(params.question, 200), id, ts };
        state.state = "blocked";
        writeStatus();
        const notificationTitle = blockedNotificationTitle(params.question);
        const notificationBody = truncate(params.question, 60);
        notifyHerdr(notificationTitle, notificationBody);
        const answer = await waitForOrchestratorAnswer(answerFile, signal, () => {
          notifyHerdr(notificationTitle, notificationBody);
        });
        if (typeof answer === "string") {
          try {
            fs.unlinkSync(answerFile);
          } catch {}
          try {
            fs.unlinkSync(questionFile);
          } catch {}
          return toolResult(answer);
        }
        return noOrchestratorAnswer();
      } catch {
        return noOrchestratorAnswer();
      } finally {
        state.asking = undefined;
        if (askingPreviousState)
          state.state = askingPreviousState;
        askingPreviousState = undefined;
        writeStatus();
      }
    }
  });
  pi.registerTool({
    name: "orch_agents",
    label: "Orchestrator Agents",
    description: "List live peer agents managed by the orchestrator.",
    promptSnippet: "Discover live orchestrator peer agents and their compact status",
    promptGuidelines: ["Use orch_agents to discover live peer agents before sending or reading peer messages."],
    parameters: exports_typebox.Object({
      all_workspaces: exports_typebox.Optional(exports_typebox.Boolean({ description: "Include agents in every workspace" })),
      allWorkspaces: exports_typebox.Optional(exports_typebox.Boolean({ description: "Include agents in every workspace" }))
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      return executeTool(() => JSON.stringify(peerSummaries(ownPresenceKey(ctx), params.all_workspaces === true || params.allWorkspaces === true)), "error: unable to list peer agents");
    }
  });
  pi.registerTool({
    name: "orch_send",
    label: "Send to Orchestrator Agent",
    description: "Send a coordination message to a live peer agent.",
    promptSnippet: "Send a finding or request to a live orchestrator peer agent",
    promptGuidelines: ["Use orch_send to hand findings, requests, or coordination notes to another agent."],
    parameters: exports_typebox.Object({
      target: exports_typebox.String({ description: "Peer key or unique key suffix" }),
      text: exports_typebox.String({ description: "Message to send" }),
      cross_workspace: exports_typebox.Optional(exports_typebox.Boolean({ description: "Allow sending across workspaces" })),
      allWorkspaces: exports_typebox.Optional(exports_typebox.Boolean({ description: "Allow sending across workspaces" }))
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const crossWorkspace = params.cross_workspace === true || params.allWorkspaces === true;
      return executeTool(() => sendPeerMessage(params.target, params.text, ownPresenceKey(ctx), crossWorkspace), "error: unable to send peer message");
    }
  });
  pi.registerTool({
    name: "orch_read",
    label: "Read Orchestrator Agent",
    description: "Read a live peer agent's latest result or status text.",
    promptSnippet: "Read a live orchestrator peer agent's latest result or status",
    promptGuidelines: ["Use orch_read to inspect a peer agent's latest result or status text."],
    parameters: exports_typebox.Object({
      target: exports_typebox.String({ description: "Peer key or unique key suffix" }),
      cross_workspace: exports_typebox.Optional(exports_typebox.Boolean({ description: "Allow reading across workspaces" })),
      allWorkspaces: exports_typebox.Optional(exports_typebox.Boolean({ description: "Allow reading across workspaces" }))
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const crossWorkspace = params.cross_workspace === true || params.allWorkspaces === true;
      return executeTool(() => {
        initPresence(ctx.hasUI);
        const ownKey = state.key || computeKey(ctx.hasUI);
        const resolved = resolvePeer(params.target, ownKey, crossWorkspace);
        if ("error" in resolved)
          return resolved.error;
        const result = readJson(path2.join(resolved.peer.dir, "result.json"));
        const resultRecord = isRecord(result) ? result : {};
        const text = typeof resultRecord.text === "string" ? resultRecord.text : typeof resolved.peer.status.lastText === "string" ? resolved.peer.status.lastText : "";
        return JSON.stringify({
          key: resolved.peer.key,
          workspace: workspaceOf(resolved.peer.key),
          state: optionalString(resolved.peer.status.state) ?? "unknown",
          model: peerModel(resolved.peer.status),
          text
        });
      }, "error: unable to read peer agent");
    }
  });
  pi.on("session_start", (_event, ctx) => {
    lastCtx = ctx;
    initPresence(ctx.hasUI);
    updateSessionRef(ctx);
    updateModel(ctx);
    writeStatus();
    readHerdrIdentity().catch(() => {});
    let heartbeatTicks = 0;
    heartbeat = setInterval(() => {
      try {
        heartbeatTicks += 1;
        if (lastCtx) {
          updateSessionRef(lastCtx);
          updateModel(lastCtx);
          updateContextUsage(lastCtx);
        }
        if (heartbeatTicks % 10 === 0)
          readHerdrIdentity().catch(() => {});
        writeStatus();
      } catch {}
    }, HEARTBEAT_MS);
    heartbeat.unref?.();
  });
  pi.on("model_select", (event) => {
    if (isModelSelectEvent(event) && isRecord(event.model)) {
      const provider = optionalString(event.model.provider);
      const id = optionalString(event.model.id);
      if (provider && id)
        state.model = { provider, id };
    }
    writeStatus();
  });
  pi.on("thinking_level_select", (event) => {
    if (isThinkingLevelSelectEvent(event) && typeof event.level === "string")
      state.thinking = event.level;
    writeStatus();
  });
  pi.on("before_agent_start", (event, ctx) => {
    lastCtx = ctx;
    if (isBeforeAgentStartEvent(event) && typeof event.prompt === "string" && event.prompt.trim()) {
      state.task = truncate(event.prompt, TASK_MAX);
    }
  });
  pi.on("agent_start", (_event, ctx) => {
    lastCtx = ctx;
    initPresence(ctx.hasUI);
    state.state = "working";
    state.startedAt = new Date().toISOString();
    state.finishedAt = undefined;
    state.currentFile = undefined;
    state.lastError = undefined;
    runFullText = undefined;
    updateSessionRef(ctx);
    updateModel(ctx);
    writeStatus();
  });
  pi.on("turn_end", (_event, ctx) => {
    lastCtx = ctx;
    state.turns += 1;
    updateContextUsage(ctx);
    writeStatus();
  });
  pi.on("message_end", (event, ctx) => {
    lastCtx = ctx;
    if (!isMessageEndEvent(event) || !isAssistantMessageLike(event.message))
      return;
    const message = event.message;
    const text = extractText(message.content);
    if (text.trim()) {
      lastFullText = text;
      runFullText = text;
      state.lastText = truncate(text, LAST_TEXT_MAX);
    }
    const usage = message.usage;
    if (usage) {
      state.tokens.input += usage.input ?? 0;
      state.tokens.output += usage.output ?? 0;
      state.tokens.cacheRead += usage.cacheRead ?? 0;
      state.tokens.cacheWrite += usage.cacheWrite ?? 0;
      state.cost += usage.cost?.total ?? 0;
    }
    writeStatus();
  });
  function currentFileCandidate(args) {
    if (!isRecord(args))
      return;
    const candidate = args.path ?? args.file_path ?? args.filePath;
    return typeof candidate === "string" ? candidate : undefined;
  }
  function shouldWriteToolStatus(previousTool, currentTool, file) {
    return currentTool !== previousTool || !!file;
  }
  function handleToolExecutionStart(event) {
    if (!isToolExecutionStartEvent(event))
      return;
    const name = typeof event.toolName === "string" ? event.toolName : "";
    const previousTool = state.lastTool;
    if (name)
      state.lastTool = name;
    const file = currentFileCandidate(event.args);
    if (file && file !== state.currentFile) {
      state.currentFile = file;
    }
    if (shouldWriteToolStatus(previousTool, state.lastTool, file)) {
      writeStatus();
    }
  }
  pi.on("tool_execution_start", handleToolExecutionStart);
  function finalFailedAssistantMessage(messages) {
    for (let i = messages.length - 1;i >= 0; i--) {
      const message = messages[i];
      if (!isAssistantMessageLike(message))
        continue;
      if (message.stopReason !== "error" && message.stopReason !== "aborted")
        return;
      return message;
    }
    return;
  }
  function failedAssistantError(message) {
    if (typeof message.errorMessage === "string" && message.errorMessage.trim()) {
      return message.errorMessage;
    }
    return message.stopReason === "aborted" ? "aborted" : "error";
  }
  function recordFailedAgentRun(message, ctx) {
    const stopReason = message.stopReason === "aborted" ? "aborted" : "error";
    const errorText = failedAssistantError(message);
    const partial3 = extractText(message.content);
    state.state = stopReason === "aborted" ? "aborted" : "error";
    state.lastError = errorText;
    state.finishedAt = new Date().toISOString();
    updateContextUsage(ctx);
    if (dir) {
      const text = partial3.trim() ? `${partial3.trim()}

[${stopReason}] ${errorText}` : `[${stopReason}] ${errorText}`;
      lastFullText = text;
      runFullText = text;
      state.lastText = truncate(text, LAST_TEXT_MAX);
      writeResult(text, { error: errorText, stopReason });
    }
    writeStatus();
  }
  function handleAgentEnd(event, ctx) {
    lastCtx = ctx;
    if (!isAgentEndEvent(event) || !isUnknownArray(event.messages))
      return;
    const message = finalFailedAssistantMessage(event.messages);
    if (message)
      recordFailedAgentRun(message, ctx);
  }
  pi.on("agent_end", handleAgentEnd);
  function completeSettledAgentRun(ctx) {
    state.state = lastFullText ? "done" : "idle";
    state.finishedAt = new Date().toISOString();
    updateContextUsage(ctx);
    if (lastFullText && dir) {
      writeResult(lastFullText);
    }
    if (pendingHandoff && runFullText) {
      deliverPendingHandoff(runFullText, state.key || computeKey(ctx.hasUI));
    }
    writeStatus();
  }
  function handleAgentSettled(_event, ctx) {
    lastCtx = ctx;
    if (state.state === "error" || state.state === "aborted") {
      updateContextUsage(ctx);
      writeStatus();
      return;
    }
    completeSettledAgentRun(ctx);
  }
  pi.on("agent_settled", handleAgentSettled);
  pi.events.on("herdr:blocked", (data) => {
    if (!isHerdrBlockedEvent(data))
      return;
    if (data.active) {
      if (blockedCount === 0 && !blockedNotified) {
        const notificationSummary = data.label ?? "";
        notifyHerdr(blockedNotificationTitle(notificationSummary), truncate(notificationSummary, 60));
        blockedNotified = true;
      }
      blockedCount += 1;
      blockedMessage = data.label;
    } else {
      blockedCount = Math.max(0, blockedCount - 1);
      if (blockedCount === 0) {
        blockedMessage = undefined;
        blockedNotified = false;
      }
    }
    writeStatus();
  });
  pi.on("session_shutdown", () => {
    if (heartbeat)
      clearInterval(heartbeat);
    if (poll)
      clearInterval(poll);
    try {
      watcher?.close();
    } catch {}
    state.state = "exited";
    writeStatus();
  });
}
export {
  orchestrator_bridge_default as default
};
