"use client";

import {
  ActionIcon,
  AppShell,
  Avatar,
  Badge,
  Box,
  Card,
  Container,
  Group,
  Menu,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import {
  Boxes,
  ChevronRight,
  CircleHelp,
  Ellipsis,
  Headphones,
  LayoutGrid,
  LogOut,
  Settings,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import classes from "./module-launcher.module.css";

type LauncherUser = {
  name: string;
  email: string;
};

const reservedModules = Array.from({ length: 4 }, (_, index) => ({
  id: `reserved-${index + 1}`,
  slot: index + 3,
}));

export default function ModuleLauncher({ user }: { user: LauncherUser }) {
  const initial = (user.name || user.email || "U").charAt(0).toUpperCase();

  return (
    <AppShell header={{ height: 72 }} padding={0} className={classes.shell}>
      <AppShell.Header className={classes.header}>
        <Group h="100%" px={{ base: "md", sm: "xl" }} justify="space-between" wrap="nowrap">
          <Group gap="md" wrap="nowrap">
            <Box className={classes.logoWrap}>
              <Image src="/itas-logo.png" alt="iTAS Solutions" width={108} height={42} priority />
            </Box>
            <Box visibleFrom="sm" className={classes.brandDivider} />
            <Box visibleFrom="sm">
              <Text fw={800} c="navy.9" size="sm">iTAS BackOffice</Text>
              <Text c="dimmed" size="xs">Business Operations Platform</Text>
            </Box>
          </Group>

          <Group gap="xs" wrap="nowrap">
            <Tooltip label="Help center">
              <ActionIcon variant="subtle" color="gray" size="lg" aria-label="Help center">
                <CircleHelp size={19} />
              </ActionIcon>
            </Tooltip>
            <Menu position="bottom-end" width={230} shadow="md">
              <Menu.Target>
                <UnstyledButton className={classes.userButton} aria-label="Open user menu">
                  <Group gap="sm" wrap="nowrap">
                  <Avatar color="red" radius="xl" size={36}>{initial}</Avatar>
                  <Box visibleFrom="sm" className={classes.userCopy}>
                    <Text size="sm" fw={700} truncate>{user.name}</Text>
                    <Text size="xs" c="dimmed" truncate>{user.email}</Text>
                  </Box>
                  <Ellipsis size={18} aria-hidden="true" />
                  </Group>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Signed in as {user.name}</Menu.Label>
                <Menu.Item color="red" leftSection={<LogOut size={16} />} onClick={() => signOut({ callbackUrl: "/login" })}>
                  Sign out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main className={classes.main}>
        <Container size={1120} py={{ base: 44, sm: 72 }} px={{ base: "md", sm: "xl" }}>
          <Stack gap={8} mb={40} className={classes.intro}>
            <Badge variant="light" color="red" size="lg" radius="sm" leftSection={<LayoutGrid size={14} />}>
              Module workspace
            </Badge>
            <Title order={1} className={classes.title}>Choose a workspace</Title>
            <Text c="dimmed" size="md" maw={620}>
              Select a module to continue. Your access is managed by your iTAS BackOffice account.
            </Text>
          </Stack>

          <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing={{ base: "md", sm: "lg" }}>
            <Card component={Link} href="/dashboard" withBorder padding="xl" radius="md" className={`${classes.moduleCard} ${classes.activeCard}`}>
              <Stack gap="lg" h="100%">
                <Group justify="space-between" align="flex-start">
                  <ThemeIcon size={52} radius="md" color="red" variant="light"><Boxes size={27} /></ThemeIcon>
                  <Badge color="green" variant="light" radius="sm">Available</Badge>
                </Group>
                <Box>
                  <Title order={2} size="h3">Asset Management</Title>
                  <Text c="dimmed" size="sm" mt={7} lh={1.55}>
                    Manage assets, maintenance contracts, customers, licenses, renewals, and reports.
                  </Text>
                </Box>
                <Group mt="auto" justify="space-between" className={classes.openLabel}>
                  <Text size="sm" fw={750}>Open module</Text>
                  <ChevronRight size={18} />
                </Group>
              </Stack>
            </Card>

            <Card component="article" withBorder padding="xl" radius="md" className={classes.moduleCard}>
              <Stack gap="lg" h="100%">
                <Group justify="space-between" align="flex-start">
                  <ThemeIcon size={52} radius="md" color="blue" variant="light"><Headphones size={27} /></ThemeIcon>
                  <Badge color="blue" variant="light" radius="sm">Coming soon</Badge>
                </Group>
                <Box>
                  <Title order={2} size="h3">Ticket Management</Title>
                  <Text c="dimmed" size="sm" mt={7} lh={1.55}>
                    A dedicated service desk workspace. The module is reserved and ready for future implementation.
                  </Text>
                </Box>
                <Text mt="auto" size="sm" fw={700} c="dimmed">Planned module</Text>
              </Stack>
            </Card>

            {reservedModules.map((module) => (
              <Card key={module.id} component="article" withBorder padding="xl" radius="md" className={`${classes.moduleCard} ${classes.reservedCard}`}>
                <Stack gap="lg" h="100%">
                  <Group justify="space-between" align="flex-start">
                    <ThemeIcon size={52} radius="md" color="gray" variant="light">
                      {module.slot % 2 === 0 ? <ShieldCheck size={26} /> : <Settings size={26} />}
                    </ThemeIcon>
                    <Badge color="gray" variant="light" radius="sm">Reserved</Badge>
                  </Group>
                  <Box>
                    <Text size="xs" fw={800} c="dimmed" tt="uppercase" lts="0.08em">Module {String(module.slot).padStart(2, "0")}</Text>
                    <Title order={2} size="h3" mt={5}>Available space</Title>
                    <Text c="dimmed" size="sm" mt={7} lh={1.55}>
                      Reserved for a future iTAS BackOffice workflow.
                    </Text>
                  </Box>
                  <Text mt="auto" size="sm" fw={700} c="dimmed">Not configured</Text>
                </Stack>
              </Card>
            ))}
          </SimpleGrid>

          <Group justify="space-between" mt={40} gap="md" className={classes.footer}>
            <Text size="xs" c="dimmed">iTAS Solutions Co., Ltd. · Internal use only</Text>
            <Text size="xs" c="dimmed">Need access? Contact your system administrator.</Text>
          </Group>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
