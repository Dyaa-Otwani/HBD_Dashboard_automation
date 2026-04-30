from flask import Blueprint, jsonify, request
from sqlalchemy import text, func
from extensions import db
import logging
from model.unmatched_data_review import UnmatchedDataReview
from model.master_table_model import MasterTable

logger = logging.getLogger("UnmatchedDataRoutes")
unmatched_data_bp = Blueprint("unmatched_data", __name__)

@unmatched_data_bp.route("/counts", methods=["GET"])
def get_counts():
    try:
        # SELECT data_type, COUNT(*) FROM unmatched_data_review WHERE status = 'pending' GROUP BY data_type;
        counts = db.session.query(
            UnmatchedDataReview.data_type,
            func.count(UnmatchedDataReview.review_id).label('count')
        ).filter(UnmatchedDataReview.correction_status == 'pending').group_by(UnmatchedDataReview.data_type).all()
        
        data = {row.data_type: row.count for row in counts}
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        logger.error(f"Error fetching unmatched counts: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@unmatched_data_bp.route("/list", methods=["GET"])
def get_list():
    try:
        data_type = request.args.get('data_type')
        if not data_type:
            return jsonify({"status": "error", "message": "data_type parameter is required"}), 400
            
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 50))
        offset = (page - 1) * limit

        # Fetch records and join with master_table to show some context if needed
        # Or just return the review records
        records = UnmatchedDataReview.query.filter_by(
            data_type=data_type, 
            correction_status='pending'
        ).limit(limit).offset(offset).all()

        total = UnmatchedDataReview.query.filter_by(
            data_type=data_type, 
            correction_status='pending'
        ).count()

        return jsonify({
            "status": "success",
            "data": [r.to_dict() for r in records],
            "total": total,
            "page": page,
            "limit": limit
        })
    except Exception as e:
        logger.error(f"Error fetching unmatched list: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@unmatched_data_bp.route("/fix", methods=["POST"])
def manual_fix():
    try:
        req_data = request.get_json()
        if not req_data:
            return jsonify({"status": "error", "message": "Invalid JSON payload"}), 400

        review_id = req_data.get('id')
        new_value = req_data.get('new_value')

        if not review_id or new_value is None:
            return jsonify({"status": "error", "message": "Missing required fields"}), 400

        # Start transaction
        review_record = UnmatchedDataReview.query.get(review_id)
        if not review_record:
            return jsonify({"status": "error", "message": "Review record not found"}), 404

        # Since we do not have a master_id, we just update the correction status
        review_record.correction_status = 'corrected'
        review_record.invalid_value = new_value # Optionally save the new value here

        db.session.commit()
        return jsonify({"status": "success", "message": "Record corrected successfully"})

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error during manual fix: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
