import Form from "next/form";
import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { MAX_QUERY_LENGTH } from "@/lib/highlight";

// A plain GET form to /search: works without JavaScript, and next/form adds
// client-side navigation once JS has loaded. `tag` keeps an active topic filter
// across a new query (a hidden field); the "All" chip under the form drops it.
export function PostSearchForm({ defaultValue = "", tag }: { defaultValue?: string; tag?: string }) {
  return (
    <Form action="/search" role="search" className="flex w-full flex-col gap-3 sm:flex-row sm:items-end">
      {tag ? <input type="hidden" name="tag" value={tag} /> : null}
      <Field className="flex-1">
        <FieldLabel htmlFor="search-query" className="sr-only">
          Search posts
        </FieldLabel>
        <InputGroup>
          <InputGroupInput
            // Uncontrolled: re-mount when the query changes so client navigation and Back show the current query.
            key={defaultValue}
            id="search-query"
            name="q"
            type="search"
            defaultValue={defaultValue}
            placeholder="Search posts, e.g. Suspense"
            autoComplete="off"
            maxLength={MAX_QUERY_LENGTH}
          />
          <InputGroupAddon>
            <SearchIcon aria-hidden="true" />
          </InputGroupAddon>
        </InputGroup>
      </Field>
      <Button type="submit">Search</Button>
    </Form>
  );
}
