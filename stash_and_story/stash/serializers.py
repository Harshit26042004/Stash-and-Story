from rest_framework import serializers
from .models import Expense

class ExpenseSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    date = serializers.DateField() # Explicitly defining it allows overrides

    class Meta:
        model = Expense
        fields = ['id', 'amount', 'category', 'category_display', 'description', 'date']

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be a positive number.")
        return value