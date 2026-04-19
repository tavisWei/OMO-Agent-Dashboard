import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('os', () => ({
  default: {
    homedir: vi.fn(),
    platform: vi.fn(),
  },
}));

import os from 'os';
import {
  getHomeDir,
  getPlatform,
  getConfigDir,
  getDataDir,
  getOpenAgentPath,
  getOpencodePath,
  getOmoPath,
  getDbPath,
  getAllPaths,
} from './paths';

describe('paths', () => {
  const mockHomedir = os.homedir as ReturnType<typeof vi.fn>;
  const mockPlatform = os.platform as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockHomedir.mockReturnValue('/home/testuser');
    mockPlatform.mockReturnValue('linux');
    delete process.env.APPDATA;
    delete process.env.LOCALAPPDATA;
    delete process.env.XDG_CONFIG_HOME;
    delete process.env.XDG_DATA_HOME;
    delete process.env.OH_MY_OPENAGENT_CONFIG_PATH;
    delete process.env.OPENCODE_CONFIG_PATH;
    delete process.env.OH_MY_OPENCODE_CONFIG_PATH;
    delete process.env.OPENCODE_DB_PATH;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getHomeDir', () => {
    it('returns os.homedir()', () => {
      expect(getHomeDir()).toBe('/home/testuser');
      expect(mockHomedir).toHaveBeenCalled();
    });
  });

  describe('getPlatform', () => {
    it('returns os.platform()', () => {
      expect(getPlatform()).toBe('linux');
      expect(mockPlatform).toHaveBeenCalled();
    });
  });

  describe('getConfigDir', () => {
    it('returns XDG path on Linux', () => {
      mockPlatform.mockReturnValue('linux');
      expect(getConfigDir()).toBe('/home/testuser/.config/opencode');
    });

    it('returns XDG path on macOS', () => {
      mockPlatform.mockReturnValue('darwin');
      expect(getConfigDir()).toBe('/home/testuser/.config/opencode');
    });

    it('returns APPDATA path on Windows', () => {
      mockPlatform.mockReturnValue('win32');
      process.env.APPDATA = 'C:\\Users\\TestUser\\AppData\\Roaming';
      expect(getConfigDir()).toBe('C:\\Users\\TestUser\\AppData\\Roaming/opencode');
    });

    it('falls back to homedir on Windows without APPDATA', () => {
      mockPlatform.mockReturnValue('win32');
      delete process.env.APPDATA;
      expect(getConfigDir()).toBe('/home/testuser/opencode');
    });

    it('uses XDG_CONFIG_HOME when set', () => {
      mockPlatform.mockReturnValue('linux');
      process.env.XDG_CONFIG_HOME = '/custom/config';
      expect(getConfigDir()).toBe('/custom/config/opencode');
    });
  });

  describe('getDataDir', () => {
    it('returns XDG data path on Linux', () => {
      mockPlatform.mockReturnValue('linux');
      expect(getDataDir()).toBe('/home/testuser/.local/share/opencode');
    });

    it('returns XDG data path on macOS', () => {
      mockPlatform.mockReturnValue('darwin');
      expect(getDataDir()).toBe('/home/testuser/.local/share/opencode');
    });

    it('returns LOCALAPPDATA path on Windows', () => {
      mockPlatform.mockReturnValue('win32');
      process.env.LOCALAPPDATA = 'C:\Users\TestUser\AppData\Local';
      expect(getDataDir()).toBe('C:\Users\TestUser\AppData\Local/opencode');
    });

    it('falls back to homedir on Windows without LOCALAPPDATA', () => {
      mockPlatform.mockReturnValue('win32');
      delete process.env.LOCALAPPDATA;
      expect(getDataDir()).toBe('/home/testuser/opencode');
    });

    it('uses XDG_DATA_HOME when set', () => {
      mockPlatform.mockReturnValue('linux');
      process.env.XDG_DATA_HOME = '/custom/data';
      expect(getDataDir()).toBe('/custom/data/opencode');
    });
  });

  describe('getOpenAgentPath', () => {
    it('returns env var when set', () => {
      process.env.OH_MY_OPENAGENT_CONFIG_PATH = '/custom/openagent.json';
      expect(getOpenAgentPath()).toBe('/custom/openagent.json');
    });

    it('returns default path when env var not set', () => {
      mockPlatform.mockReturnValue('linux');
      expect(getOpenAgentPath()).toBe('/home/testuser/.config/opencode/oh-my-openagent.json');
    });
  });

  describe('getOpencodePath', () => {
    it('returns env var when set', () => {
      process.env.OPENCODE_CONFIG_PATH = '/custom/opencode.json';
      expect(getOpencodePath()).toBe('/custom/opencode.json');
    });

    it('returns default path when env var not set', () => {
      mockPlatform.mockReturnValue('linux');
      expect(getOpencodePath()).toBe('/home/testuser/.config/opencode/opencode.json');
    });
  });

  describe('getOmoPath', () => {
    it('returns env var when set', () => {
      process.env.OH_MY_OPENCODE_CONFIG_PATH = '/custom/omo.jsonc';
      expect(getOmoPath()).toBe('/custom/omo.jsonc');
    });

    it('returns default path when env var not set', () => {
      mockPlatform.mockReturnValue('linux');
      expect(getOmoPath()).toBe('/home/testuser/.config/opencode/oh-my-opencode.jsonc');
    });
  });

  describe('getDbPath', () => {
    it('returns env var when set', () => {
      process.env.OPENCODE_DB_PATH = '/custom/db.sqlite';
      expect(getDbPath()).toBe('/custom/db.sqlite');
    });

    it('returns default path when env var not set', () => {
      mockPlatform.mockReturnValue('linux');
      expect(getDbPath()).toBe('/home/testuser/.local/share/opencode/opencode.db');
    });
  });

  describe('getAllPaths', () => {
    it('returns all paths as object', () => {
      mockPlatform.mockReturnValue('linux');
      const paths = getAllPaths();

      expect(paths).toHaveProperty('openAgentPath');
      expect(paths).toHaveProperty('opencodePath');
      expect(paths).toHaveProperty('omoPath');
      expect(paths).toHaveProperty('dbPath');
      expect(paths).toHaveProperty('configDir');
      expect(paths).toHaveProperty('dataDir');
      expect(paths).toHaveProperty('homeDir');
      expect(paths).toHaveProperty('platform');
      expect(paths.platform).toBe('linux');
      expect(paths.homeDir).toBe('/home/testuser');
    });
  });
});
