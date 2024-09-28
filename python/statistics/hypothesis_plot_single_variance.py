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

  chi_square_statistic = (n - 1) * sample_variance / sigma_0_squared
  df = n - 1  # Degrees of freedom

  print(f'Test type: {test_type}')

  # Generate x-axis values for the chi-square distribution
  x = np.linspace(0, chi2.ppf(0.999, df) + 5, 500)
  y = chi2.pdf(x, df)
  plt.plot(x, y, label='Chi-Square Distribution')

  if test_type == 'left':
    critical_value = chi2.ppf(alpha, df)
    x_rejection = np.linspace(0, critical_value, 100)
    y_rejection = chi2.pdf(x_rejection, df)
    plt.fill_between(x_rejection, y_rejection, 0, color='red', alpha=0.3, label='Rejection Region')
    plt.title('Chi-Square Distribution with Rejection Region (Left-Tailed)')
  elif test_type == 'right':
    critical_value = chi2.ppf(1 - alpha, df)
    x_rejection = np.linspace(critical_value, chi2.ppf(0.999, df) + 5, 100)
    y_rejection = chi2.pdf(x_rejection, df)
    plt.fill_between(x_rejection, y_rejection, 0, color='red', alpha=0.3, label='Rejection Region')
    plt.title('Chi-Square Distribution with Rejection Region (Right-Tailed)')
  else:
    print("Invalid test type. Please choose 'left' or 'right'.")
    return

  plt.axvline(chi_square_statistic, color='blue', linestyle='--', label='Calculated chi-square statistic')
  plt.axvline(critical_value, color='green', linestyle='--', label='Critical chi-square value')

  # Calculate the p-value
  if test_type == 'left':
      p_value = chi2.cdf(chi_square_statistic, df)
  elif test_type == 'right':
      p_value = 1 - chi2.cdf(chi_square_statistic, df)

  plt.xlabel('Chi-square statistic')
  plt.ylabel('Probability Density')
  plt.legend()
  plt.show()

  print(f"Calculated chi-square statistic: {chi_square_statistic}")
  print(f"Critical chi-square value: {critical_value}")
  print(f"P-value: {p_value}")


  if p_value < alpha:
    print("Reject the null hypothesis.")
  else:
    print("Fail to reject the null hypothesis.")

  print("#-----------------------------------------------")



# Example usage:
sample_data = np.array([10, 12, 15, 18, 20])
sample_variance = np.var(sample_data, ddof=1)  # Sample variance with Bessel's correction
plot_hypothesis_test_single_variance(sigma_0_squared=10, sample_variance=sample_variance, n=len(sample_data), alpha=0.05, test_type='right')
