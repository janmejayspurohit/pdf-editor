import React from 'react';
import { Center, ScrollArea, Text, Stack } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import FileListItem from '@app/components/fileManager/FileListItem';
import FileHistoryGroup from '@app/components/fileManager/FileHistoryGroup';
import EmptyFilesState from '@app/components/fileManager/EmptyFilesState';
import { useFileManagerContext } from '@app/contexts/FileManagerContext';

interface FileListAreaProps {
  scrollAreaHeight: string;
  scrollAreaStyle?: React.CSSProperties;
}

const FileListArea: React.FC<FileListAreaProps> = ({
  scrollAreaHeight,
  scrollAreaStyle = {},
}) => {
  const {
    activeSource,
    recentFiles,
    filteredFiles,
    selectedFilesSet,
    expandedFileIds,
    loadedHistoryFiles,
    onFileSelect,
    onFileRemove,
    onHistoryFileRemove,
    onFileDoubleClick,
    onDownloadSingle,
    isFileSupported,
    isLoading,
    activeFileIds,
  } = useFileManagerContext();
  const { t } = useTranslation();

  if (activeSource === 'local') {
    return (
      <EmptyFilesState />
    );
  }

  if (activeSource === 'recent') {
    return (
      <ScrollArea
        h={scrollAreaHeight}
        style={{
          ...scrollAreaStyle
        }}
        type="always"
        scrollbarSize={8}
      >
        <Stack gap={0}>
          {recentFiles.length === 0 && !isLoading ? (
            <EmptyFilesState />
          ) : recentFiles.length === 0 && isLoading ? (
            <Center style={{ height: '12.5rem' }}>
              <Text c="dimmed" ta="center">{t('fileManager.loadingFiles', 'Loading files...')}</Text>
            </Center>
          ) : (
            filteredFiles.map((file, index) => {
              const historyFiles = loadedHistoryFiles.get(file.id) || [];
              const isExpanded = expandedFileIds.has(file.id);
              const isActive = activeFileIds.includes(file.id);

              return (
                <React.Fragment key={file.id}>
                  <FileListItem
                    file={file}
                    isSelected={selectedFilesSet.has(file.id)}
                    isSupported={isFileSupported(file.name)}
                    onSelect={(shiftKey) => onFileSelect(file, index, shiftKey)}
                    onRemove={() => onFileRemove(index)}
                    onDownload={() => onDownloadSingle(file)}
                    onDoubleClick={() => onFileDoubleClick(file)}
                    isHistoryFile={false}
                    isLatestVersion={true}
                    isActive={isActive}
                  />

                  <FileHistoryGroup
                    leafFile={file}
                    historyFiles={historyFiles}
                    isExpanded={isExpanded}
                    onDownloadSingle={onDownloadSingle}
                    onFileDoubleClick={onFileDoubleClick}
                    onHistoryFileRemove={onHistoryFileRemove}
                    isFileSupported={isFileSupported}
                  />
                </React.Fragment>
              );
            })
          )}
        </Stack>
      </ScrollArea>
    );
  }

  return null;
};

export default FileListArea;
