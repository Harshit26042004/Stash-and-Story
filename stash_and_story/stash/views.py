from django.db.models import Sum
from django.db.models.functions import TruncMonth, TruncYear, TruncWeek, TruncQuarter
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import viewsets, permissions
from .models import Expense
from .serializers import ExpenseSerializer
from .pagination import ExpensePagination


class CrudViews(viewsets.ModelViewSet):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = ExpensePagination

    @action(detail=False, methods=["get"])
    def all_expenses(self, request):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return Response(serializer.data)

    def get_queryset(self):
        return Expense.objects.filter(user=self.request.user).order_by("-date")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"])
    def dashboard_data(self, request):
        period = request.query_params.get("period", "month")

        trunc_func = {
            "week": TruncWeek("date"),
            "month": TruncMonth("date"),
            "quarter": TruncQuarter("date"),
            "year": TruncYear("date"),
        }.get(period, TruncMonth("date"))

        stats = (
            self.get_queryset()
            .exclude(category="INCOME")
            .annotate(time_period=trunc_func)
            .values("time_period", "category")
            .annotate(total_spent=Sum("amount"))
            .order_by("-time_period")
        )

        return Response(stats)
