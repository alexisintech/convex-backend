import { JSONValue, ValidatorJSON, Value } from "convex/values";
import React, { useCallback, useState } from "react";
import {
  FilterByIndex,
  FilterByIndexRange,
} from "system-udfs/convex/_system/frontend/lib/filters";
import { Checkbox } from "@common/elements/Checkbox";
import { ObjectEditor } from "@common/elements/ObjectEditor/ObjectEditor";
import { Combobox, Option } from "@common/elements/Combobox";
import { DateTimePicker } from "@common/features/data/components/FilterEditor/DateTimePicker";
import { cn } from "@common/lib/cn";
import { UNDEFINED_PLACEHOLDER } from "system-udfs/convex/_system/frontend/patchDocumentsFields";
import { Tooltip } from "@common/elements/Tooltip";

export type IndexFilterState = FilterByIndex | FilterByIndexRange;

export type IndexFilterEditorProps = {
  idx: number;
  field: string;
  onChange(filter: IndexFilterState, idx: number): void;
  onApplyFilters(): void;
  onError(idx: number, errors: string[]): void;
  filter: IndexFilterState;
  autoFocusValueEditor?: boolean;
  documentValidator?: ValidatorJSON;
  shouldSurfaceValidatorErrors?: boolean;
  previousFiltersEnabled: boolean[];
  nextFiltersEnabled?: boolean[];
};

// Options for the filter type combobox
const filterTypeOptions: Option<string>[] = [
  { value: "equals", label: "equals" },
  { value: "lt", label: "<" },
  { value: "lte", label: "<=" },
  { value: "gt", label: ">" },
  { value: "gte", label: ">=" },
  { value: "between", label: "is between" },
];

export function IndexFilterEditor({
  idx,
  field,
  onChange,
  onApplyFilters,
  onError,
  filter,
  autoFocusValueEditor = false,
  documentValidator,
  shouldSurfaceValidatorErrors,
  previousFiltersEnabled,
  nextFiltersEnabled = [],
}: IndexFilterEditorProps) {
  const [prevIsLastEnabledFilter, setPrevIsLastEnabledFilter] = useState<
    boolean | null
  >(null);

  // Check if all previous filters are enabled
  const canBeEnabled = previousFiltersEnabled.every((enabled) => enabled);

  // Check if any subsequent filters are enabled
  const canBeDisabled = !nextFiltersEnabled.some((enabled) => enabled);

  // Check if this is the last enabled filter
  const isLastEnabledFilter =
    filter.enabled && nextFiltersEnabled.every((enabled) => !enabled);

  // Convert to equals filter if no longer the last enabled filter
  React.useEffect(() => {
    // Skip on first render or if the filter is not enabled
    if (prevIsLastEnabledFilter === null || !filter.enabled) {
      setPrevIsLastEnabledFilter(isLastEnabledFilter);
      return;
    }

    // If it was the last enabled filter but is no longer
    if (prevIsLastEnabledFilter && !isLastEnabledFilter) {
      // Convert to equals filter
      if (!("value" in filter)) {
        // Determine which value to use
        let newValue = null;
        if (
          "lowerValue" in filter &&
          filter.lowerValue !== null &&
          filter.lowerValue !== undefined
        ) {
          newValue = filter.lowerValue;
        } else if (
          "upperValue" in filter &&
          filter.upperValue !== null &&
          filter.upperValue !== undefined
        ) {
          newValue = filter.upperValue;
        }

        const regularFilter: FilterByIndex = {
          type: "indexEq",
          enabled: filter.enabled,
          value: newValue,
        };
        onChange(regularFilter, idx);
      }
    }

    setPrevIsLastEnabledFilter(isLastEnabledFilter);
  }, [isLastEnabledFilter, filter, idx, onChange, prevIsLastEnabledFilter]);

  // Determine if this is a range filter
  const isRangeFilter = filter.type === "indexRange";

  // Check if this is a _creationTime field
  const isCreationTimeField = field === "_creationTime";

  // Determine the current operator
  const getCurrentOperator = (): string => {
    if (!isRangeFilter) {
      return "equals";
    }

    if (
      "lowerOp" in filter &&
      "upperOp" in filter &&
      filter.lowerOp !== undefined &&
      filter.upperOp !== undefined
    ) {
      return "between";
    }

    if ("lowerOp" in filter && filter.lowerOp) {
      return filter.lowerOp;
    }

    if ("upperOp" in filter && filter.upperOp) {
      return filter.upperOp;
    }

    return "between";
  };

  const currentOperator = getCurrentOperator();

  // Handle changes to the filter's enabled state
  const handleEnabledChange = useCallback(
    (event: React.SyntheticEvent<HTMLInputElement>) => {
      const enabled = (event.target as HTMLInputElement).checked;

      // If trying to disable and subsequent filters are enabled, prevent the change
      if (!enabled && !canBeDisabled) {
        return;
      }

      onChange({ ...filter, enabled }, idx);
    },
    [filter, idx, onChange, canBeDisabled],
  );

  // Handle changes to the filter's value
  const handleValueChange = useCallback(
    (value?: Value) => {
      if (filter.type !== "indexEq") {
        throw new Error("Called handleValueChange for non-equals filter");
      }
      onChange({ ...filter, value }, idx);
    },
    [filter, idx, onChange],
  );

  // Handle date change for _creationTime
  const handleDateChange = useCallback(
    (date: Date) => {
      const timestamp = date.getTime();

      if (filter.type === "indexEq") {
        onChange({ ...filter, value: timestamp }, idx);
      } else if (
        ("lowerValue" in filter && currentOperator === "lt") ||
        currentOperator === "lte"
      ) {
        onChange({ ...filter, lowerValue: timestamp }, idx);
      } else if (
        ("upperValue" in filter && currentOperator === "gt") ||
        currentOperator === "gte"
      ) {
        onChange({ ...filter, upperValue: timestamp }, idx);
      }
    },
    [filter, idx, onChange, currentOperator],
  );

  // Handle lower date change for _creationTime between
  const handleLowerDateChange = useCallback(
    (date: Date) => {
      if ("lowerValue" in filter) {
        onChange({ ...filter, lowerValue: date.getTime() }, idx);
      }
    },
    [filter, idx, onChange],
  );

  // Handle upper date change for _creationTime between
  const handleUpperDateChange = useCallback(
    (date: Date) => {
      if ("upperValue" in filter) {
        onChange({ ...filter, upperValue: date.getTime() }, idx);
      }
    },
    [filter, idx, onChange],
  );

  // Handle changes to range filter values
  const handleLowerValueChange = useCallback(
    (value?: Value) => {
      if ("lowerValue" in filter) {
        // Convert Value to JSONValue to ensure compatibility
        const jsonValue: JSONValue | undefined =
          value === undefined
            ? null
            : typeof value === "bigint"
              ? Number(value)
              : (value as JSONValue);
        onChange({ ...filter, lowerValue: jsonValue }, idx);
      }
    },
    [filter, idx, onChange],
  );

  const handleUpperValueChange = useCallback(
    (value?: Value) => {
      if ("upperValue" in filter) {
        // Convert Value to JSONValue to ensure compatibility
        const jsonValue: JSONValue | undefined =
          value === undefined
            ? null
            : typeof value === "bigint"
              ? Number(value)
              : (value as JSONValue);
        onChange({ ...filter, upperValue: jsonValue }, idx);
      }
    },
    [filter, idx, onChange],
  );

  // Convert to range filter
  const convertToRangeFilter = useCallback(() => {
    if (filter.type === "indexEq") {
      const rangeFilter: FilterByIndexRange = {
        type: "indexRange",
        enabled: filter.enabled,
        lowerOp: "gte",
        lowerValue: filter.value,
        upperOp: "lte",
        upperValue: filter.value,
      };
      onChange(rangeFilter, idx);
    } else if (filter.type === "indexRange") {
      // Handle conversion from single operator range filter to between range filter
      let value = null;

      // Try to get a value from the existing filter
      if (
        "lowerValue" in filter &&
        filter.lowerValue !== null &&
        filter.lowerValue !== undefined
      ) {
        value = filter.lowerValue;
      } else if (
        "upperValue" in filter &&
        filter.upperValue !== null &&
        filter.upperValue !== undefined
      ) {
        value = filter.upperValue;
      }

      const rangeFilter: FilterByIndexRange = {
        type: "indexRange",
        enabled: filter.enabled,
        lowerOp: "gte",
        lowerValue: value,
        upperOp: "lte",
        upperValue: value,
      };

      onChange(rangeFilter, idx);
    }
  }, [filter, idx, onChange]);

  // Convert to regular filter
  const convertToRegularFilter = useCallback(() => {
    if ("lowerValue" in filter) {
      const regularFilter: FilterByIndex = {
        type: "indexEq",
        enabled: filter.enabled,
        value: filter.lowerValue ?? null,
      };
      onChange(regularFilter, idx);
    }
  }, [filter, idx, onChange]);

  // Convert to single operator range filter
  const convertToSingleOperatorFilter = useCallback(
    (op: "lt" | "lte" | "gt" | "gte") => {
      let value = null;

      // Try to preserve the current value
      if (filter.type === "indexEq") {
        value = filter.value;
      } else if ("lowerValue" in filter) {
        value = filter.lowerValue;
      } else if ("upperValue" in filter) {
        value = filter.upperValue;
      }

      const rangeFilter: FilterByIndexRange = {
        type: "indexRange",
        enabled: filter.enabled,
        lowerOp: op === "gt" || op === "gte" ? op : undefined,
        lowerValue: op === "gt" || op === "gte" ? value : null,
        upperOp: op === "lt" || op === "lte" ? op : undefined,
        upperValue: op === "lt" || op === "lte" ? value : null,
      };

      onChange(rangeFilter, idx);
    },
    [filter, idx, onChange],
  );

  // Handle filter type change
  const handleFilterTypeChange = useCallback(
    (option: string | null) => {
      if (!option) return;

      if (option === "equals") {
        convertToRegularFilter();
      } else if (option === "between") {
        convertToRangeFilter();
      } else if (["lt", "lte", "gt", "gte"].includes(option)) {
        convertToSingleOperatorFilter(option as "lt" | "lte" | "gt" | "gte");
      }
    },
    [
      convertToRegularFilter,
      convertToRangeFilter,
      convertToSingleOperatorFilter,
    ],
  );

  // Handle errors from ObjectEditor
  const handleError = useCallback(
    (newErrors: string[]) => {
      onError(idx, newErrors);
    },
    [idx, onError],
  );

  // Helper to get timestamp value or default to current time
  const getTimestampValue = (value: any): Date => {
    if (typeof value === "number") {
      return new Date(value);
    }
    return new Date();
  };

  // Reusable DateTimePicker component
  const renderDateTimePicker = (
    value: any,
    onChangeHandler: (date: Date) => void,
    className = "",
  ) => (
    <DateTimePicker
      date={getTimestampValue(value)}
      onChange={onChangeHandler}
      disabled={!filter.enabled}
      className={className}
    />
  );

  // Render the appropriate value editor based on the filter type
  const renderValueEditor = () => {
    // Regular filter (equals)
    if (filter.type === "indexEq") {
      return (
        <div className="ml-[-1px] min-w-0 flex-1">
          {isCreationTimeField ? (
            renderDateTimePicker(filter.value, handleDateChange, "rounded-r")
          ) : (
            <ObjectEditorWithPlaceholder
              value={filter.value}
              onChangeHandler={handleValueChange}
              path={`indexFilter${idx}-${field}-${filter.type}`}
              autoFocus={autoFocusValueEditor}
              className="rounded-l-none rounded-r"
              filter={filter}
              onApplyFilters={onApplyFilters}
              handleError={handleError}
              documentValidator={documentValidator}
              shouldSurfaceValidatorErrors={shouldSurfaceValidatorErrors}
            />
          )}
        </div>
      );
    }

    // Single operator range filter (lt, lte, gt, gte)
    if (
      isRangeFilter &&
      (currentOperator === "lt" ||
        currentOperator === "lte" ||
        currentOperator === "gt" ||
        currentOperator === "gte")
    ) {
      const value =
        currentOperator === "lt" || currentOperator === "lte"
          ? filter.lowerValue
          : filter.upperValue;
      const handler =
        currentOperator === "lt" || currentOperator === "lte"
          ? handleLowerValueChange
          : handleUpperValueChange;

      return (
        <div className="ml-[-1px] flex-1">
          {isCreationTimeField ? (
            renderDateTimePicker(value, handleDateChange, "rounded-r")
          ) : (
            <ObjectEditorWithPlaceholder
              value={value}
              onChangeHandler={handler}
              path={`indexFilter${idx}-${field}-${filter.type}`}
              autoFocus={autoFocusValueEditor}
              className="rounded-l-none rounded-r"
              filter={filter}
              onApplyFilters={onApplyFilters}
              handleError={handleError}
              documentValidator={documentValidator}
              shouldSurfaceValidatorErrors={shouldSurfaceValidatorErrors}
            />
          )}
        </div>
      );
    }

    // Between range filter
    if (isRangeFilter && currentOperator === "between") {
      return (
        <div className="ml-[-1px] flex w-full min-w-0 flex-1 grow flex-col items-center">
          {/* Lower bound value */}
          <div className="w-full flex-1">
            {isCreationTimeField ? (
              renderDateTimePicker(
                filter.lowerValue,
                handleLowerDateChange,
                "rounded-tr",
              )
            ) : (
              <ObjectEditorWithPlaceholder
                value={filter.lowerValue}
                onChangeHandler={handleLowerValueChange}
                path={`indexFilterLower${idx}-${field}-${filter.type}`}
                autoFocus={autoFocusValueEditor}
                className="rounded-l-none rounded-br-none rounded-tr"
                filter={filter}
                onApplyFilters={onApplyFilters}
                handleError={handleError}
                documentValidator={documentValidator}
                shouldSurfaceValidatorErrors={shouldSurfaceValidatorErrors}
              />
            )}
          </div>

          {/* Upper bound value */}
          <div className="w-full flex-1">
            {isCreationTimeField ? (
              renderDateTimePicker(
                filter.upperValue,
                handleUpperDateChange,
                "mt-[-1px] rounded-br",
              )
            ) : (
              <ObjectEditorWithPlaceholder
                value={filter.upperValue}
                onChangeHandler={handleUpperValueChange}
                path={`indexFilterUpper${idx}-${field}-${filter.type}`}
                className="rounded-l-none rounded-br rounded-tr-none border-t-0"
                filter={filter}
                onApplyFilters={onApplyFilters}
                handleError={handleError}
                documentValidator={documentValidator}
                shouldSurfaceValidatorErrors={shouldSurfaceValidatorErrors}
              />
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex min-w-0 grow">
        {/* Checkbox for enabled state */}
        <div className="flex items-center pr-2">
          <Tooltip
            tip={
              filter.enabled && !canBeDisabled
                ? "Cannot disable this index filter because subsequent filters are enabled."
                : !filter.enabled && !canBeEnabled
                  ? "Cannot enable this index filter because previous filters are disabled."
                  : undefined
            }
            side="right"
          >
            <Checkbox
              checked={filter.enabled}
              onChange={handleEnabledChange}
              disabled={!canBeEnabled || (filter.enabled && !canBeDisabled)}
              aria-label={`Enable filter ${idx}`}
            />
          </Tooltip>
        </div>

        {/* Field name display */}
        <Tooltip
          tip={
            filter.enabled
              ? "You cannot edit this field because it is a part of the definition of the selected index."
              : undefined
          }
        >
          <div
            className={cn(
              "flex h-full min-w-[1rem] max-w-[7rem] items-center truncate rounded-l border bg-background-secondary px-2 py-1 text-xs cursor-not-allowed",
              filter.enabled
                ? "bg-background-secondary"
                : "bg-background-tertiary text-content-secondary",
            )}
          >
            {field}
          </div>
        </Tooltip>

        {/* Filter type selector only for the last enabled filter */}
        {isLastEnabledFilter ? (
          <Combobox
            label="Select filter type"
            size="sm"
            optionsWidth="fixed"
            buttonClasses="w-fit h-full"
            innerButtonClasses="min-w-fit h-full rounded-r-none rounded-l-none ml-[-1px] border-l"
            options={filterTypeOptions}
            selectedOption={currentOperator}
            setSelectedOption={handleFilterTypeChange}
            disabled={!filter.enabled}
          />
        ) : (
          <div
            className={cn(
              "ml-[-1px] flex w-fit items-center border px-2 py-1 text-xs cursor-not-allowed",
              filter.enabled
                ? "bg-background-secondary"
                : "bg-background-tertiary text-content-secondary",
            )}
          >
            {currentOperator === "between"
              ? "is between"
              : currentOperator === "lt"
                ? "<"
                : currentOperator === "lte"
                  ? "<="
                  : currentOperator === "gt"
                    ? ">"
                    : currentOperator === "gte"
                      ? ">="
                      : "equals"}
          </div>
        )}

        {/* Render the appropriate value editor */}
        {renderValueEditor()}
      </div>
    </div>
  );
}

// Create a separate component for ObjectEditor with placeholder
function ObjectEditorWithPlaceholder({
  value,
  onChangeHandler,
  path,
  autoFocus = false,
  className = "",
  filter,
  onApplyFilters,
  handleError,
  documentValidator,
  shouldSurfaceValidatorErrors,
}: {
  value: any;
  onChangeHandler: (value?: Value) => void;
  path: string;
  autoFocus?: boolean;
  className?: string;
  filter: IndexFilterState;
  onApplyFilters: () => void;
  handleError: (errors: string[]) => void;
  documentValidator?: ValidatorJSON;
  shouldSurfaceValidatorErrors?: boolean;
}) {
  const [innerText, setInnerText] = useState("");
  const [_objectEditorKey, _setObjectEditorKey] = useState(0);

  return (
    <>
      {filter.enabled &&
        innerText === "" &&
        value === UNDEFINED_PLACEHOLDER && (
          <div
            className="pointer-events-none absolute z-50 font-mono text-xs italic text-content-secondary"
            data-testid="undefined-placeholder"
            style={{
              marginTop: "5px",
              marginLeft: "11px",
            }}
          >
            unset
          </div>
        )}
      <ObjectEditor
        key={path}
        className={cn(
          "w-full min-w-4 border focus-within:border focus-within:border-border-selected",
          filter.enabled && "border-l-transparent",
          className,
        )}
        editorClassname={cn(
          "px-2 py-1 mt-0 rounded bg-background-secondary text-xs",
          className,
        )}
        allowTopLevelUndefined
        size="sm"
        disableFolding
        defaultValue={value === UNDEFINED_PLACEHOLDER ? undefined : value}
        onChange={onChangeHandler}
        onError={handleError}
        path={path}
        autoFocus={autoFocus}
        disableFind
        saveAction={onApplyFilters}
        enterSaves
        mode="editField"
        validator={documentValidator}
        shouldSurfaceValidatorErrors={shouldSurfaceValidatorErrors}
        disabled={!filter.enabled}
        onChangeInnerText={setInnerText}
      />
    </>
  );
}
