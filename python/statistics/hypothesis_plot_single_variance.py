# prompt: create function to plot hypothesis test single variance with chi-square like mean, to show conclusion, p - value too (include two side test)

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from statsmodels.formula.api import ols
from statsmodels.stats.anova import anova_lm
from statsmodels.stats.multicomp import pairwise_tukeyhsd
import scipy.stats as stats
import numpy as np
import statsmodels.api as sm
from scipy.stats import norm
from scipy.stats import norm, t, chi2


def plot_hypothesis_test_single_variance(sigma_0_squared, sample_variance, n, alpha, test_type):
  """
  Plots the chi-square distribution with rejection region for a hypothesis test of a single variance.

  Args:
    sigma_0_squared: The null hypothesis population variance.
    sample_variance: The sample variance.
    n: The sample size.
    alpha: The significance level.
    test_type: The type of test ('left', 'right', 'two').
  """

  df = n - 1  # Degrees of freedom

  # Calculate the chi-square statistic
  chi_square_statistic = (n - 1) * sample_variance / sigma_0_squared

  # Generate x-axis values for the chi-square distribution
  x = np.linspace(0, chi2.ppf(0.999, df) + 5, 500)

  y = chi2.pdf(x, df)
  plt.plot(x, y, label='Chi-square Distribution')

  if test_type == 'left':
    critical_value = chi2.ppf(alpha, df)
    x_rejection = np.linspace(0, critical_value, 100)
    y_rejection = chi2.pdf(x_rejection, df)
    plt.fill_between(x_rejection, y_rejection, 0, color='red', alpha=0.3, label='Rejection Region')
    plt.title('Chi-square Distribution with Rejection Region (Left-Tailed)')

  elif test_type == 'right':
    critical_value = chi2.ppf(1 - alpha, df)
    x_rejection = np.linspace(critical_value, chi2.ppf(0.999, df) + 5, 100)
    y_rejection = chi2.pdf(x_rejection, df)
    plt.fill_between(x_rejection, y_rejection, 0, color='red', alpha=0.3, label='Rejection Region')
    plt.title('Chi-square Distribution with Rejection Region (Right-Tailed)')

  elif test_type == 'two':
    critical_value_lower = chi2.ppf(alpha / 2, df)
    critical_value_upper = chi2.ppf(1 - alpha / 2, df)
    x_rejection_left = np.linspace(0, critical_value_lower, 100)
    y_rejection_left = chi2.pdf(x_rejection_left, df)
    plt.fill_between(x_rejection_left, y_rejection_left, 0, color='red', alpha=0.3, label='Rejection Region')
    x_rejection_right = np.linspace(critical_value_upper, chi2.ppf(0.999, df) + 5, 100)
    y_rejection_right = chi2.pdf(x_rejection_right, df)
    plt.fill_between(x_rejection_right, y_rejection_right, 0, color='red', alpha=0.3)
    plt.title('Chi-square Distribution with Rejection Region (Two-Tailed)')

  else:
    print("Invalid test type. Please choose 'left', 'right', or 'two'.")
    return


  plt.axvline(chi_square_statistic, color='blue', linestyle='--', label='Calculated Chi-square statistic')

  if test_type == 'left' or test_type == 'right':
    plt.axvline(critical_value, color='green', linestyle='--', label='Critical Chi-square value')

  elif test_type == 'two':
    plt.axvline(critical_value_lower, color='green', linestyle='--', label='Critical Chi-square values')
    plt.axvline(critical_value_upper, color='green', linestyle='--')


  plt.xlabel('Chi-square statistic')
  plt.ylabel('Probability Density')
  plt.legend()
  plt.show()

  print(f"Calculated Chi-square statistic: {chi_square_statistic}")

  if test_type == 'left' or test_type == 'right':
    print(f"Critical Chi-square value: {critical_value}")

  elif test_type == 'two':
    print(f"Critical Chi-square values: {critical_value_lower}, {critical_value_upper}")

  # Calculate the p-value
  if test_type == 'left':
    p_value = chi2.cdf(chi_square_statistic, df)
  elif test_type == 'right':
    p_value = 1 - chi2.cdf(chi_square_statistic, df)
  elif test_type == 'two':
    if chi_square_statistic < critical_value_lower:
      p_value = 2 * chi2.cdf(chi_square_statistic, df)
    else:
      p_value = 2 * (1 - chi2.cdf(chi_square_statistic, df))
  else:
    print("Invalid test type. Please choose 'left', 'right', or 'two'.")
    return

  print(f"P-value: {p_value}")

  if p_value < alpha:
    print("Reject the null hypothesis.")
  else:
    print("Fail to reject the null hypothesis.")


# Example usage
plot_hypothesis_test_single_variance(sigma_0_squared=25, sample_variance=30, n=20, alpha=0.05, test_type='right')
