import { Request, Response } from 'express';

export const getUserDashboard = (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'Welcome to User Dashboard',
    data: {
      role: req.user?.role,
      userId: req.user?.userId,
      email: req.user?.email,
      dashboardInfo: {
        title: 'Cognitive Readiness Overview',
        status: 'Active',
        nextAlarm: '07:00 AM',
        cognitiveScore: 'Foundation Mode Ready',
      },
    },
  });
};

export const getCoachDashboard = (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Coach Dashboard',
    data: {
      role: req.user?.role,
      userId: req.user?.userId,
      email: req.user?.email,
      dashboardInfo: {
        title: 'Coach Administration Panel',
        assignedTraineesCount: 12,
        activeSchedules: 8,
        coachingAlerts: 'All systems operational',
      },
    },
  });
};

export const getAdminDashboard = (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Admin Dashboard',
    data: {
      role: req.user?.role,
      userId: req.user?.userId,
      email: req.user?.email,
      dashboardInfo: {
        title: 'System Management & Platform Overview',
        totalUsers: 142,
        systemHealth: '100% Operational',
        rolesDistribution: {
          users: 120,
          coaches: 18,
          admins: 4,
        },
      },
    },
  });
};
