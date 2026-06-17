export interface PermissionDef {
  id: number;
  name: string;
  description: string | null;
}

export interface GroupRef {
  id: number;
  name: string;
}

export interface Member {
  id: number;
  user: {
    id: number;
    email: string;
    username: string;
  };
  groups: GroupRef[];
  direct_permissions: GroupRef[];
  permissions: string[];
  is_owner: boolean;
}

export interface Group {
  id: number;
  name: string;
  description: string | null;
  parent_id: number | null;
  is_system: boolean;
  permissions: GroupRef[];
  member_count: number;
}
