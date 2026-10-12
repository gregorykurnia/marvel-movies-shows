"use client";

import { useState, useTransition } from "react";

import { setCharacterTags } from "@/actions/characters";
import { TagInput } from "@/components/tags/tag-input";
import { Panel } from "@/components/ui/panel";
import { useToast } from "@/components/ui/toast";

// The Tags card on a character's page. It replaces the read-only list. Changes save at once, so there's no save
// button. If a save fails, the tags go back to what was saved and a message says why.
export function CharacterTagsCard({
  characterId,
  initial,
  options,
}: {
  characterId: string;
  initial: string[];
  options: string[];
}) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [tags, setTags] = useState(initial);

  function change(next: string[]) {
    const saved = tags;
    setTags(next);
    startTransition(async () => {
      try {
        const result = await setCharacterTags(characterId, next);
        if (!result.ok) {
          setTags(saved);
          toast(`Couldn't save the tags: ${result.message}`);
        }
      } catch {
        setTags(saved);
        toast("Couldn't save the tags. Check your connection and try again.");
      }
    });
  }

  return (
    <Panel className="p-5">
      <h2 className="mb-3 font-display text-[15px] font-bold">Tags</h2>
      <TagInput label="Add a tag" value={tags} onChange={change} options={options} hint="Saved as you change them." />
    </Panel>
  );
}
