from odoo import http
from odoo.http import request
import datetime



class DayBookReportController(http.Controller):
    @http.route('/daybook_report', type='http', auth='user', website=True)
    def get_daybook_report(self, **data):
        report_obj = request.env['report.om_account_daily_reports.report_daybook']
        docids = []
        report_data = {
            'form': {
                'target_move': data.get('target_move'),
                'date_from': data.get('date_from'),
                'date_to': data.get('date_to'),
                'journal_ids': eval(data.get('journal_ids', '[]')),
                'operating_unit_ids': eval(data.get('operating_unit_ids', '[]')),
            }
        }

        result = report_obj.with_context(active_model='account.daybook.report')._get_report_values(docids, report_data)
        result.update({
            'res_company': request.env.company,
            'time': datetime,
            'context_timestamp': lambda t: datetime.datetime.now(),
        })
        return request.render('om_account_daily_reports.daybook_report_template', result)
