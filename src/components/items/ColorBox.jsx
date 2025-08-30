import React from 'react';

/**
 * The definition for the Color Box item.
 * It is purely decorative and has no inputs or outputs.
 */
export const itemDefinition = {
  name: 'Group Box',
  defaultSize: {
    width: 20,
    height: 15,
  },
  inputs: [],
  outputs: [],
};

/**
 * This item is rendered with special logic inside WorkspaceItem.jsx,
 * so a standard ItemComponent is not needed.
 */
export const ItemComponent = () => null;
