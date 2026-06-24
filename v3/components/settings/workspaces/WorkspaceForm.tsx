'use client';

import { useState, type SyntheticEvent } from 'react';

import { BooleanField } from '@/components/settings/BooleanField';
import { TextField } from '@/components/settings/TextField';
import { Button } from '@/components/ui/Button';
import { slugifyWorkspaceName, type Workspace } from '@/lib/workspaces';

export type WorkspaceFormValues = Pick<Workspace, 'name' | 'slug' | 'isPublic'>;

type Props = {
  initialWorkspace?: Workspace;
  onSubmit: (values: WorkspaceFormValues) => void | Promise<void>;
  isSubmitting?: boolean;
};

export const WorkspaceForm = ({ initialWorkspace, onSubmit, isSubmitting }: Props) => {
  const [name, setName] = useState(initialWorkspace?.name ?? '');
  const [slug, setSlug] = useState(initialWorkspace?.slug ?? '');
  const [isPublic, setIsPublic] = useState(initialWorkspace?.isPublic ?? true);

  const isDefault = initialWorkspace?.isDefault ?? false;
  const isEditing = initialWorkspace !== undefined;

  const handleNameChange = (newName: string) => {
    setName(newName);

    if (!isDefault) {
      setSlug(slugifyWorkspaceName(newName));
    }
  };

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onSubmit({ name: name.trim(), slug: slug.trim(), isPublic });
  };

  return (
    <form onSubmit={handleSubmit}>
      <TextField
        id="workspace-name"
        label="Name"
        value={name}
        onChange={handleNameChange}
        disabled={isSubmitting}
        required
      />

      <TextField
        id="workspace-slug"
        label="Slug"
        value={slug}
        onChange={setSlug}
        disabled={isSubmitting || isDefault}
        hint={
          isDefault
            ? 'The default workspace lives at / and has no slug.'
            : 'Auto-generated from the name. Edit to override; the next name change will re-sync.'
        }
        required={!isDefault}
      />

      <BooleanField
        id="workspace-isPublic"
        label="Visible to guests"
        value={isPublic}
        onChange={setIsPublic}
        disabled={isSubmitting}
      />

      <Button type="submit" disabled={isSubmitting}>
        {isEditing ? 'Save changes' : 'Create workspace'}
      </Button>
    </form>
  );
};
