'use client';

import { useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useDeferredValue, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { IconCell } from './IconCell';
import styles from './IconPicker.module.css';
import { fetchAllIcons, filterIcons } from './utils';

type Props = {
  value: string;
  onChange: (name: string) => void;
  triggerLabel?: string;
};

const CELL_MIN_PX = 76;
const ROW_GAP_PX = 4;
const SCROLL_OVERSCAN = 4;

export const IconPicker = ({ value, onChange, triggerLabel = 'Pick icon' }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [columns, setColumns] = useState(8);

  const scrollerRef = useRef<HTMLDivElement>(null);

  const closeModal = useCallback(() => setIsOpen(false), []);
  const openModal = useCallback(() => setIsOpen(true), []);

  const {
    data: icons = [],
    isFetching,
    error,
  } = useQuery({
    queryKey: ['icons', 'all'],
    queryFn: fetchAllIcons,
    enabled: isOpen,
    staleTime: Infinity,
  });

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    const updateColumns = () => {
      const width = scroller.clientWidth;
      const next = Math.max(2, Math.floor(width / CELL_MIN_PX));

      setColumns(next);
    };

    updateColumns();

    const observer = new ResizeObserver(updateColumns);

    observer.observe(scroller);

    return () => observer.disconnect();
  }, [isOpen]);

  const filteredIcons = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return filterIcons(icons, normalizedQuery);
  }, [icons, deferredQuery]);

  const rowCount = Math.ceil(filteredIcons.length / columns);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollerRef.current,
    estimateSize: () => CELL_MIN_PX + ROW_GAP_PX,
    overscan: SCROLL_OVERSCAN,
  });

  const handleSelect = useCallback(
    (name: string) => {
      onChange(name);
      closeModal();
    },
    [onChange, closeModal],
  );

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalHeight = rowVirtualizer.getTotalSize();
  const selectedIcon = icons.find(({ name }) => name === value);

  return (
    <div className={styles.field}>
      <span className={styles.preview} aria-hidden="true">
        {selectedIcon ? (
          <Icon path={selectedIcon.path} />
        ) : (
          <span className={styles.previewEmpty}>none</span>
        )}
      </span>

      <button type="button" className={styles.trigger} onClick={openModal}>
        {triggerLabel}
      </button>

      {value ? (
        <code className={styles.iconLabel} aria-label="Current icon name">
          {value}
        </code>
      ) : null}

      <Modal isOpen={isOpen} onClose={closeModal}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Choose an icon</h3>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search icons by name or tag"
            value={query}
            onChange={event => setQuery(event.target.value)}
            autoFocus
          />
          <div className={styles.statusRow}>
            <span>
              {isFetching ? 'Loading icons…' : `${filteredIcons.length} of ${icons.length} icons`}
            </span>
            {error ? <span>{error.message}</span> : null}
          </div>
        </div>

        <div ref={scrollerRef} className={styles.scroller}>
          {filteredIcons.length === 0 && !isFetching ? (
            <div className={styles.empty}>No icons match your search.</div>
          ) : (
            <div className={styles.virtualContainer} style={{ height: totalHeight }}>
              {virtualRows.map(virtualRow => {
                const startIndex = virtualRow.index * columns;
                const rowItems = filteredIcons.slice(startIndex, startIndex + columns);

                return (
                  <div
                    key={virtualRow.key}
                    className={styles.row}
                    style={{
                      transform: `translateY(${virtualRow.start}px)`,
                      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                    }}
                  >
                    {rowItems.map(({ name, path }) => (
                      <IconCell
                        key={name}
                        name={name}
                        path={path}
                        isSelected={name === value}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
