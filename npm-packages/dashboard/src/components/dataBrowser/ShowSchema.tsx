import {
  ReadonlyCode,
  Spinner,
  SchemaJson,
  displaySchema,
} from "dashboard-common";
import { useMemo } from "react";
import { Shape } from "shapes";
import { Tab as HeadlessTab } from "@headlessui/react";
import { Tab } from "elements/Tab";
import { ConvexSchemaFilePath } from "components/dataBrowser/ConvexSchemaFilePath";
import {
  GenerateSchema,
  CodeTransformation,
  LineHighlighter,
} from "./GenerateSchema";

export function ShowSchema({
  activeSchema,
  inProgressSchema,
  shapes,
  hasShapeError = false,
  lineHighlighter = undefined,
  codeTransformation = (code) => code,
  showLearnMoreLink = true,
}: {
  activeSchema: SchemaJson | null | undefined;
  inProgressSchema: SchemaJson | null | undefined;
  shapes: Map<string, Shape>;
  hasShapeError?: boolean;
  lineHighlighter?: LineHighlighter;
  codeTransformation?: CodeTransformation;
  showLearnMoreLink?: boolean;
}) {
  const displayedSchema = useMemo(() => {
    if (!activeSchema) {
      return "";
    }
    const schema = displaySchema(activeSchema);
    return schema ? codeTransformation(schema) : "";
  }, [activeSchema, codeTransformation]);

  const noSavedSchema = !activeSchema && !inProgressSchema;
  return (
    <div className="max-w-full">
      <HeadlessTab.Group>
        <HeadlessTab.List className="flex gap-1">
          <Tab
            disabled={noSavedSchema}
            tip={
              noSavedSchema
                ? "Your project doesn’t have a saved schema yet. Edit convex/schema.ts to add one."
                : undefined
            }
          >
            Saved
          </Tab>
          <Tab>Generated</Tab>
        </HeadlessTab.List>
        <HeadlessTab.Panels className="p-3">
          <HeadlessTab.Panel>
            {activeSchema && (
              <>
                <p className="mb-2">
                  This is a representation of the schema that is{" "}
                  {activeSchema?.schemaValidation
                    ? "currently being enforced"
                    : "saved"}
                  . It is equivalent to your <ConvexSchemaFilePath />.
                </p>
                <div
                  className="block whitespace-pre-wrap break-words rounded border p-4 text-sm"
                  aria-hidden="true"
                >
                  <ReadonlyCode
                    disableLineNumbers
                    path="generateSchema"
                    highlightLines={
                      lineHighlighter
                        ? lineHighlighter(displayedSchema)
                        : undefined
                    }
                    code={displayedSchema}
                    language="javascript"
                    height={{ type: "content", maxHeightRem: 52 }}
                  />
                </div>
              </>
            )}

            {inProgressSchema && (
              <div className="flex items-center gap-1 text-sm text-content-secondary">
                <div>
                  <Spinner />
                </div>{" "}
                A new schema is being validated after a code push…
              </div>
            )}
          </HeadlessTab.Panel>
          <HeadlessTab.Panel>
            <GenerateSchema
              shapes={shapes}
              hadError={hasShapeError}
              showUsageInstructions={noSavedSchema}
              lineHighlighter={lineHighlighter}
              codeTransformation={codeTransformation}
              showLearnMoreLink={showLearnMoreLink}
            />
          </HeadlessTab.Panel>
        </HeadlessTab.Panels>
      </HeadlessTab.Group>
    </div>
  );
}
