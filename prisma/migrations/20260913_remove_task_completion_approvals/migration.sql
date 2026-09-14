DELETE FROM "ControllerApprovalRequest"
WHERE "action" = 'TASK_COMPLETED'
  AND "status" = 'PENDING';
