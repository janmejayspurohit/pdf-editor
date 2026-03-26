import React, { useState } from 'react';
import { Stack, Text, Button, Group } from '@mantine/core';
import HistoryIcon from '@mui/icons-material/History';
import PhonelinkIcon from '@mui/icons-material/Phonelink';
import { useTranslation } from 'react-i18next';
import { useFileManagerContext } from '@app/contexts/FileManagerContext';
import { useFileActionTerminology } from '@app/hooks/useFileActionTerminology';
import { useFileActionIcons } from '@app/hooks/useFileActionIcons';
import { useAppConfig } from '@app/contexts/AppConfigContext';
import { useIsMobile } from '@app/hooks/useIsMobile';
import MobileUploadModal from '@app/components/shared/MobileUploadModal';

interface FileSourceButtonsProps {
  horizontal?: boolean;
}

const FileSourceButtons: React.FC<FileSourceButtonsProps> = ({
  horizontal = false
}) => {
  const { activeSource, onSourceChange, onLocalFileClick, onNewFilesSelect } = useFileManagerContext();
  const { t } = useTranslation();
  const terminology = useFileActionTerminology();
  const icons = useFileActionIcons();
  const UploadIcon = icons.upload;
  const [mobileUploadModalOpen, setMobileUploadModalOpen] = useState(false);
  const { config } = useAppConfig();
  const isMobile = useIsMobile();
  const isMobileUploadEnabled = config?.enableMobileScanner && !isMobile;

  const handleMobileUploadClick = () => {
    setMobileUploadModalOpen(true);
  };

  const handleFilesReceivedFromMobile = (files: File[]) => {
    if (files.length > 0) {
      onNewFilesSelect(files);
    }
  };

  // Determine visibility of Mobile QR Scanner button
  const shouldHideMobileQR = !isMobileUploadEnabled && config?.hideDisabledToolsMobileQRScanner;

  const buttonProps = {
    variant: (source: string) => activeSource === source ? 'filled' : 'subtle',
    getColor: (source: string) => activeSource === source ? 'var(--mantine-color-gray-2)' : undefined,
    getStyles: (source: string) => ({
      root: {
        backgroundColor: activeSource === source ? undefined : 'transparent',
        color: activeSource === source ? 'var(--mantine-color-gray-9)' : 'var(--mantine-color-gray-6)',
        border: 'none',
        '&:hover': {
          backgroundColor: activeSource === source ? undefined : 'var(--mantine-color-gray-0)'
        }
      }
    })
  };

  const buttons = (
    <>
      <Button
        leftSection={<HistoryIcon />}
        justify={horizontal ? "center" : "flex-start"}
        onClick={() => onSourceChange('recent')}
        fullWidth={!horizontal}
        size={horizontal ? "xs" : "sm"}
        color={buttonProps.getColor('recent')}
        styles={buttonProps.getStyles('recent')}
      >
        {horizontal ? t('fileManager.recent', 'Recent') : t('fileManager.recent', 'Recent')}
      </Button>

      <Button
        variant="subtle"
        color='var(--mantine-color-gray-6)'
        leftSection={<UploadIcon />}
        justify={horizontal ? "center" : "flex-start"}
        onClick={onLocalFileClick}
        fullWidth={!horizontal}
        size={horizontal ? "xs" : "sm"}
        styles={{
          root: {
            backgroundColor: 'transparent',
            border: 'none',
            '&:hover': {
              backgroundColor: 'var(--mantine-color-gray-0)'
            }
          }
        }}
      >
        {horizontal ? terminology.upload : terminology.uploadFiles}
      </Button>

      {!shouldHideMobileQR && (
        <Button
          variant="subtle"
          color='var(--mantine-color-gray-6)'
          leftSection={<PhonelinkIcon />}
          justify={horizontal ? "center" : "flex-start"}
          onClick={handleMobileUploadClick}
          fullWidth={!horizontal}
          size={horizontal ? "xs" : "sm"}
          disabled={!isMobileUploadEnabled}
          styles={{
            root: {
              backgroundColor: 'transparent',
              border: 'none',
              '&:hover': {
                backgroundColor: isMobileUploadEnabled ? 'var(--mantine-color-gray-0)' : 'transparent'
              }
            }
          }}
          title={!isMobileUploadEnabled ? t('fileManager.mobileUploadNotAvailable', 'Mobile upload not available') : undefined}
        >
          {horizontal ? t('fileManager.mobileShort', 'Mobile') : t('fileManager.mobileUpload', 'Mobile Upload')}
        </Button>
      )}
    </>
  );

  if (horizontal) {
    return (
      <>
        <Group gap="xs" justify="center" style={{ width: '100%' }}>
          {buttons}
        </Group>
        <MobileUploadModal
          opened={mobileUploadModalOpen}
          onClose={() => setMobileUploadModalOpen(false)}
          onFilesReceived={handleFilesReceivedFromMobile}
        />
      </>
    );
  }

  return (
    <>
      <Stack gap="xs" style={{ height: '100%' }}>
        <Text size="sm" pt="sm" fw={500} c="dimmed" mb="xs" style={{ paddingLeft: '1rem' }}>
          {t('fileManager.myFiles', 'My Files')}
        </Text>
        {buttons}
      </Stack>
      <MobileUploadModal
        opened={mobileUploadModalOpen}
        onClose={() => setMobileUploadModalOpen(false)}
        onFilesReceived={handleFilesReceivedFromMobile}
      />
    </>
  );
};

export default FileSourceButtons;
