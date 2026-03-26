import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MultiSelect, Loader, Text, Button, Stack } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { alert } from '@app/components/toast';
import { UserSummary } from '@app/types/signingSession';
import apiClient from '@app/services/apiClient';
import { Z_INDEX_OVER_FILE_MANAGER_MODAL } from '@app/styles/zIndex';

interface UserSelectorProps {
  value: number[];
  onChange: (userIds: number[]) => void;
  placeholder?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
}

type SelectItem = { value: string; label: string };
type GroupedData = { group: string; items: SelectItem[] };

const UserSelector = ({ value, onChange, placeholder, size = 'sm', disabled = false }: UserSelectorProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectData, setSelectData] = useState<GroupedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stringValue, setStringValue] = useState<string[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await apiClient.get('/api/v1/user/users');
        const fetchedUsers = response.data || [];
        const usersByTeam: Record<string, SelectItem[]> = {};

        fetchedUsers
          .filter((u: UserSummary) => u && u.userId && u.username)
          .filter((u: UserSummary) => u.teamName?.toLowerCase() !== 'internal')
          .forEach((user: UserSummary) => {
            const teamName = user.teamName || t('certSign.collab.userSelector.noTeam', 'No Team');
            if (!usersByTeam[teamName]) {
              usersByTeam[teamName] = [];
            }
            const displayName = user.displayName || user.username || 'Unknown';
            const username = user.username || 'unknown';
            const label =
              displayName !== username ? `${displayName} (@${username})` : displayName;
            usersByTeam[teamName].push({
              value: String(user.userId),
              label,
            });
          });

        const processed: GroupedData[] = Object.entries(usersByTeam).map(([teamName, items]) => ({
          group: teamName,
          items: items.sort((a, b) => a.label.localeCompare(b.label)),
        }));

        setSelectData(processed);
      } catch (error) {
        console.error('Failed to load users:', error);
        alert({
          alertType: 'error',
          title: t('common.error'),
          body: t('certSign.collab.userSelector.loadError', 'Failed to load users'),
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [t]);

  useEffect(() => {
    const safeValue = Array.isArray(value) ? value : [];
    setStringValue(safeValue.map((id) => (id != null ? id.toString() : '')).filter(Boolean));
  }, [value]);

  if (loading) {
    return <Loader size="sm" />;
  }

  if (!selectData || selectData.length === 0) {
    return (
      <Stack gap="xs" align="flex-start">
        <Text size="sm" c="dimmed">
          {t('certSign.collab.userSelector.noUsers', 'No other users found.')}
        </Text>
        <Button size="xs" variant="light" onClick={() => navigate('/settings/people')}>
          {t('certSign.collab.userSelector.inviteUsers', 'Add Users')}
        </Button>
      </Stack>
    );
  }

  return (
    <MultiSelect
      data={selectData}
      value={stringValue}
      onChange={(selectedIds) => {
        const parsedIds = selectedIds
          .map((id) => parseInt(id, 10))
          .filter((id) => !isNaN(id));
        onChange(parsedIds);
      }}
      placeholder={placeholder || t('certSign.collab.userSelector.placeholder', 'Select users...')}
      searchable
      clearable
      size={size}
      disabled={disabled}
      maxDropdownHeight={300}
      comboboxProps={{ withinPortal: true, zIndex: Z_INDEX_OVER_FILE_MANAGER_MODAL + 10 }}
    />
  );
};

export default UserSelector;
