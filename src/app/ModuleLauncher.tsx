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
  ChevronRight,
  CircleHelp,
  Ellipsis,
  LayoutGrid,
  LogOut,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { BACKOFFICE_MODULES, type BackofficeModule } from "@/config/modules";
import classes from "./module-launcher.module.css";

type LauncherUser = {
  name: string;
  email: string;
};

const statusLabel = { available: "Available", planned: "Coming soon", reserved: "Reserved" } as const;
const statusColor = { available: "green", planned: "blue", reserved: "gray" } as const;

function ModuleCard({ module }: { module: BackofficeModule }) {
  const Icon = module.icon;
  const content = (
    <Stack gap="lg" h="100%">
      <Group justify="space-between" align="flex-start">
        <ThemeIcon size={52} radius="md" color={module.color} variant="light"><Icon size={27} /></ThemeIcon>
        <Badge color={statusColor[module.status]} variant="light" radius="sm">{statusLabel[module.status]}</Badge>
      </Group>
      <Box>
        {module.status === "reserved" && (
          <Text size="xs" fw={800} c="dimmed" tt="uppercase" lts="0.08em">
            Module {String(module.slot).padStart(2, "0")}
          </Text>
        )}
        <Title order={2} size="h3" mt={module.status === "reserved" ? 5 : 0}>{module.name}</Title>
        <Text c="dimmed" size="sm" mt={7} lh={1.55}>{module.description}</Text>
      </Box>
      {module.href ? (
        <Group mt="auto" justify="space-between" className={classes.openLabel}>
          <Text size="sm" fw={750}>Open module</Text>
          <ChevronRight size={18} />
        </Group>
      ) : (
        <Text mt="auto" size="sm" fw={700} c="dimmed">
          {module.status === "planned" ? "Planned module" : "Not configured"}
        </Text>
      )}
    </Stack>
  );

  if (module.href) {
    return <Card component={Link} href={module.href} withBorder padding="xl" radius="md" className={`${classes.moduleCard} ${classes.activeCard}`}>{content}</Card>;
  }

  return <Card component="article" withBorder padding="xl" radius="md" className={`${classes.moduleCard} ${module.status === "reserved" ? classes.reservedCard : ""}`}>{content}</Card>;
}

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
            {BACKOFFICE_MODULES.map((module) => <ModuleCard key={module.id} module={module} />)}
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
