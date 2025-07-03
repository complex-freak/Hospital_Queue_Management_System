from typing import Dict, Any
from datetime import datetime, timedelta
from sqlalchemy import select, func, and_, extract, case
from sqlalchemy.ext.asyncio import AsyncSession

from models import Queue, QueueStatus

async def get_queue_analytics(db: AsyncSession, days: int = 30) -> Dict[str, Any]:
    """Get queue analytics for the specified time period"""
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Get hourly queue distribution
    hourly_distribution = await db.execute(
        select(
            extract('hour', Queue.created_at).label('hour'),
            func.count(Queue.id).label('count')
        )
        .where(Queue.created_at >= start_date)
        .group_by(extract('hour', Queue.created_at))
        .order_by(extract('hour', Queue.created_at))
    )
    
    # Get daily queue counts
    daily_queues = await db.execute(
        select(
            func.date(Queue.created_at).label('date'),
            func.count(Queue.id).label('count')
        )
        .where(Queue.created_at >= start_date)
        .group_by(func.date(Queue.created_at))
        .order_by(func.date(Queue.created_at))
    )
    
    # Get average wait times by day
    daily_wait_times = await db.execute(
        select(
            func.date(Queue.created_at).label('date'),
            func.avg(
                func.extract('epoch', Queue.served_at - Queue.created_at) / 60
            ).label('avg_wait_time')
        )
        .where(
            and_(
                Queue.status == QueueStatus.COMPLETED,
                Queue.created_at >= start_date,
                Queue.served_at.isnot(None)
            )
        )
        .group_by(func.date(Queue.created_at))
        .order_by(func.date(Queue.created_at))
    )
    
    # Get weekday distribution
    weekday_distribution = await db.execute(
        select(
            extract('dow', Queue.created_at).label('weekday'),
            func.count(Queue.id).label('count')
        )
        .where(Queue.created_at >= start_date)
        .group_by(extract('dow', Queue.created_at))
        .order_by(extract('dow', Queue.created_at))
    )
    
    # Get queue status distribution
    queue_status_distribution = await db.execute(
        select(
            Queue.status,
            func.count(Queue.id).label('count')
        )
        .where(Queue.created_at >= start_date)
        .group_by(Queue.status)
    )
    
    # Get hourly served rate
    hourly_served_rate = await db.execute(
        select(
            extract('hour', Queue.created_at).label('hour'),
            func.count(Queue.id).label('total'),
            func.sum(
                case(
                    [(Queue.status == QueueStatus.COMPLETED, 1)],
                    else_=0
                )
            ).label('served')
        )
        .where(Queue.created_at >= start_date)
        .group_by(extract('hour', Queue.created_at))
        .order_by(extract('hour', Queue.created_at))
    )
    
    return {
        "hourly_distribution": [
            {"hour": int(row.hour), "count": row.count}
            for row in hourly_distribution.all()
        ],
        "daily_queues": [
            {"date": str(row.date), "count": row.count}
            for row in daily_queues.all()
        ],
        "daily_wait_times": [
            {"date": str(row.date), "avg_wait_time": int(row.avg_wait_time or 0)}
            for row in daily_wait_times.all()
        ],
        "weekday_distribution": [
            {"weekday": int(row.weekday), "count": row.count}
            for row in weekday_distribution.all()
        ],
        "queue_status_distribution": [
            {"status": row.status.value, "count": row.count}
            for row in queue_status_distribution.all()
        ],
        "hourly_served_rate": [
            {
                "hour": int(row.hour), 
                "total": row.total, 
                "served": row.served or 0,
                "rate": round((row.served or 0) / row.total * 100, 2) if row.total > 0 else 0
            }
            for row in hourly_served_rate.all()
        ]
    } 