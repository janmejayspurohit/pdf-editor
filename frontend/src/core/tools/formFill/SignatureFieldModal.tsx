/**
 * SignatureFieldModal — Modal dialog for capturing a user's ink signature
 * for a specific signature form field.
 *
 * Renders a canvas where the user can draw their signature, then confirms
 * to store the data URL in FormFillContext.
 */
import React, { useState, useCallback } from 'react';
import { Modal, Button, Group, Stack, Text } from '@mantine/core';
import { DrawSignatureCanvas } from '@app/components/shared/wetSignature/DrawSignatureCanvas';

interface SignatureFieldModalProps {
  fieldName: string;
  fieldLabel: string;
  opened: boolean;
  onClose: () => void;
  onConfirm: (fieldName: string, dataUrl: string) => void;
}

export function SignatureFieldModal({
  fieldName,
  fieldLabel,
  opened,
  onClose,
  onConfirm,
}: SignatureFieldModalProps) {
  const [signatureData, setSignatureData] = useState<string | null>(null);

  const handleChange = useCallback((data: string | null) => {
    setSignatureData(data);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!signatureData) return;
    onConfirm(fieldName, signatureData);
    onClose();
  }, [signatureData, fieldName, onConfirm, onClose]);

  const handleClose = useCallback(() => {
    setSignatureData(null);
    onClose();
  }, [onClose]);

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={`Sign: ${fieldLabel || fieldName}`}
      size="lg"
      centered
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Draw your signature below. Click Confirm to apply it to the field.
        </Text>
        <DrawSignatureCanvas
          signature={signatureData}
          onChange={handleChange}
        />
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!signatureData}
          >
            Confirm Signature
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
